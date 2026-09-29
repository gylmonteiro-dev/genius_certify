from io import BytesIO
from uuid import uuid4

import pytest
from PIL import Image

from app.core.exceptions import AppError, NotFoundError
from app.models.curso import Curso, CursoStatus
from app.models.curso_colaborador import ExibicaoColaboradores
from app.models.instituicao import Instituicao, InstituicaoStatus
from app.models.usuario import Usuario, UsuarioRole
from app.services.capa_evento import chaves_capa_do_evento, publicar_capa, remover_capa
from app.services.publico_service import PublicoService
from app.services.storage_service import CAPA_CACHE_CONTROL, StorageService


class MemoryStorage:
    def __init__(self) -> None:
        self.objects: dict[str, bytes] = {}
        self.deleted: list[str] = []
        self.cache: dict[str, str] = {}
        self.fail_detail = False

    @property
    def public_base_url(self) -> str:
        return "http://minio.local/certificados"

    def upload_bytes(
        self,
        *,
        data: bytes,
        key: str,
        content_type: str,
        cache_control: str | None = None,
    ) -> str:
        if self.fail_detail and "capa-detail-" in key:
            raise RuntimeError("falha no detail")
        self.objects[key] = data
        if cache_control:
            self.cache[key] = cache_control
        return f"{self.public_base_url}/{key}"

    def delete_keys(self, keys: list[str]) -> None:
        for key in keys:
            self.deleted.append(key)
            self.objects.pop(key, None)

    def key_from_url(self, url: str | None) -> str | None:
        prefix = f"{self.public_base_url}/"
        if url and url.startswith(prefix):
            return url[len(prefix) :]
        return None

    def build_evento_capa_key(self, instituicao_id, evento_id, kind: str, version: str) -> str:
        return StorageService.build_evento_capa_key(
            instituicao_id,
            evento_id,
            kind,
            version,
        )


class FakeSession:
    def __init__(self, *, fail: bool = False) -> None:
        self.fail = fail
        self.committed = False
        self.rolled_back = False

    async def commit(self) -> None:
        if self.fail:
            raise RuntimeError("commit falhou")
        self.committed = True

    async def rollback(self) -> None:
        self.rolled_back = True


def _jpeg() -> bytes:
    image = Image.new("RGB", (1600, 1000), (30, 90, 200))
    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=85)
    image.close()
    return buffer.getvalue()


def _curso() -> Curso:
    curso = Curso(
        instituicao_id=uuid4(),
        titulo="Oficina",
        descricao="",
        carga_horaria=4,
        instrutor="",
        status=CursoStatus.UPCOMING,
        exibicao_colaboradores=ExibicaoColaboradores.AUTOMATICO,
    )
    curso.id = uuid4()
    return curso


@pytest.mark.asyncio
async def test_substituicao_grava_novas_urls_e_apaga_as_antigas() -> None:
    curso = _curso()
    storage = MemoryStorage()
    session = FakeSession()
    primeira = await publicar_capa(
        curso,
        data=_jpeg(),
        filename="capa.jpg",
        content_type="image/jpeg",
        foco_x=0.2,
        foco_y=0.8,
        storage=storage,
        session=session,
    )
    assert primeira.foco_x == 0.2
    antiga_card = curso.capa_card_url
    antiga_detail = curso.capa_detail_url
    assert antiga_card and antiga_detail
    assert all(value == CAPA_CACHE_CONTROL for value in storage.cache.values())
    assert curso.capa_card_url and "capa-card-" in curso.capa_card_url
    assert curso.capa_detail_url and "capa-detail-" in curso.capa_detail_url

    await publicar_capa(
        curso,
        data=_jpeg(),
        filename="nova.jpg",
        content_type="image/jpeg",
        foco_x=None,
        foco_y=None,
        storage=storage,
        session=session,
    )
    assert curso.capa_card_url != antiga_card
    assert curso.capa_detail_url != antiga_detail
    assert storage.key_from_url(antiga_card) in storage.deleted
    assert storage.key_from_url(antiga_detail) in storage.deleted
    assert storage.key_from_url(curso.capa_card_url) in storage.objects
    assert storage.key_from_url(curso.capa_detail_url) in storage.objects


@pytest.mark.asyncio
async def test_falha_antes_do_commit_mantem_a_capa_anterior() -> None:
    curso = _curso()
    storage = MemoryStorage()
    await publicar_capa(
        curso,
        data=_jpeg(),
        filename="capa.jpg",
        content_type="image/jpeg",
        foco_x=None,
        foco_y=None,
        storage=storage,
        session=FakeSession(),
    )
    anterior = (curso.capa_card_url, curso.capa_detail_url)
    storage.fail_detail = True
    with pytest.raises(AppError, match="armazenar"):
        await publicar_capa(
            curso,
            data=_jpeg(),
            filename="capa.jpg",
            content_type="image/jpeg",
            foco_x=None,
            foco_y=None,
            storage=storage,
            session=FakeSession(),
        )
    assert (curso.capa_card_url, curso.capa_detail_url) == anterior
    assert storage.key_from_url(anterior[0]) in storage.objects


@pytest.mark.asyncio
async def test_falha_no_commit_apaga_a_nova_e_preserva_a_antiga() -> None:
    curso = _curso()
    storage = MemoryStorage()
    await publicar_capa(
        curso,
        data=_jpeg(),
        filename="capa.jpg",
        content_type="image/jpeg",
        foco_x=None,
        foco_y=None,
        storage=storage,
        session=FakeSession(),
    )
    anterior = (curso.capa_card_url, curso.capa_detail_url)
    with pytest.raises(RuntimeError, match="commit"):
        await publicar_capa(
            curso,
            data=_jpeg(),
            filename="capa.jpg",
            content_type="image/jpeg",
            foco_x=None,
            foco_y=None,
            storage=storage,
            session=FakeSession(fail=True),
        )
    assert (curso.capa_card_url, curso.capa_detail_url) == anterior
    assert storage.key_from_url(anterior[0]) not in storage.deleted


@pytest.mark.asyncio
async def test_remocao_limpa_urls_e_objetos() -> None:
    curso = _curso()
    storage = MemoryStorage()
    await publicar_capa(
        curso,
        data=_jpeg(),
        filename="capa.jpg",
        content_type="image/jpeg",
        foco_x=0.4,
        foco_y=0.6,
        storage=storage,
        session=FakeSession(),
    )
    card = curso.capa_card_url
    await remover_capa(curso, storage=storage, session=FakeSession())
    assert curso.capa_card_url is None
    assert curso.capa_detail_url is None
    assert curso.capa_foco_x is None
    assert storage.key_from_url(card) in storage.deleted


def test_limpeza_nao_atravessa_instituicao_nem_apaga_logo() -> None:
    curso = _curso()
    storage = MemoryStorage()
    outra = uuid4()
    logo = f"instituicoes/{curso.instituicao_id}/logo.png"
    alheia = (
        f"instituicoes/{outra}/eventos/{uuid4()}/capa-card-abc123abc123.webp"
    )
    propria = (
        f"instituicoes/{curso.instituicao_id}/eventos/{curso.id}/"
        "capa-card-abc123abc123.webp"
    )
    keys = chaves_capa_do_evento(
        storage,
        (
            f"{storage.public_base_url}/{logo}",
            f"{storage.public_base_url}/{alheia}",
            f"{storage.public_base_url}/{propria}",
        ),
        instituicao_id=curso.instituicao_id,
        evento_id=curso.id,
    )
    assert keys == [propria]


def test_resposta_publica_inclui_capa_e_fallback_nulo() -> None:
    instituicao = Instituicao(
        nome="Escola",
        codigo="INST-CAPA",
        cnpj="00000000000191",
        endereco="",
        responsavel="Ana",
        email="ana@example.com",
        telefone="",
        status=InstituicaoStatus.ACTIVE,
    )
    curso = _curso()
    curso.instituicao = instituicao
    curso.datas = []
    curso.colaboradores = []
    sem_capa = PublicoService.to_curso_public(curso, 0)
    assert sem_capa.capa_card_url is None
    assert sem_capa.capa_detail_url is None

    curso.capa_card_url = "http://minio.local/certificados/card.webp"
    curso.capa_detail_url = "http://minio.local/certificados/detail.webp"
    curso.capa_foco_x = 0.25
    curso.capa_foco_y = 0.75
    com_capa = PublicoService.to_curso_public(curso, 0)
    assert com_capa.capa_card_url == curso.capa_card_url
    assert com_capa.capa_detail_url == curso.capa_detail_url
    assert com_capa.capa_foco_x == 0.25
    assert com_capa.instituicao_nome == "Escola"


@pytest.mark.asyncio
async def test_admin_de_outro_tenant_nao_encontra_o_evento() -> None:
    import sys
    from unittest.mock import MagicMock

    sys.modules.setdefault("weasyprint", MagicMock())
    from app.services.curso_service import CursoService

    curso = _curso()
    actor = Usuario(
        instituicao_id=uuid4(),
        nome="Admin",
        email="admin@example.com",
        hashed_password="x",
        role=UsuarioRole.INSTITUICAO_ADMIN,
    )

    class Service(CursoService):
        async def _get_or_404(self, curso_id, *, actor):  # type: ignore[no-untyped-def]
            assert curso_id == curso.id
            assert actor.instituicao_id != curso.instituicao_id
            raise NotFoundError("Curso não encontrado")

    service = Service(session=FakeSession(), storage=MemoryStorage())  # type: ignore[arg-type]

    class Upload:
        filename = "capa.jpg"
        content_type = "image/jpeg"

        async def read(self, size: int = -1) -> bytes:
            return b""

    with pytest.raises(NotFoundError):
        await service.upload_capa(curso.id, actor=actor, file=Upload())  # type: ignore[arg-type]
