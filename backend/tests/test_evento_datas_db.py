import uuid
from datetime import date

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.config import get_settings
from app.core.exceptions import NotFoundError
from app.models.certificado import Certificado
from app.models.curso import Curso, CursoStatus
from app.models.curso_data import CursoData
from app.models.instituicao import Instituicao, InstituicaoStatus
from app.models.participante import Participante, ParticipanteStatus
from app.models.usuario import Usuario, UsuarioRole
from app.schemas.certificado import CertificadoEmitRequest
from app.schemas.curso import CursoCreate, CursoUpdate
from app.services.certificado_service import CertificadoService
from app.services.curso_service import CursoService
from app.services.pdf_service import PdfService
from app.services.publico_service import PublicoService


@pytest.fixture
async def session():
    engine = create_async_engine(get_settings().database_url)
    try:
        async with engine.connect() as connection:
            outer = await connection.begin()
            db = AsyncSession(
                bind=connection,
                expire_on_commit=False,
                autoflush=False,
                join_transaction_mode="create_savepoint",
            )
            yield db
            await db.close()
            await outer.rollback()
    except OSError as exc:
        pytest.skip(f"Postgres indisponível: {exc}")
    finally:
        await engine.dispose()


def _instituicao(suffix: str) -> Instituicao:
    return Instituicao(
        nome=f"Inst {suffix}",
        codigo=f"INST-{suffix}",
        cnpj=suffix[:14].ljust(14, "0"),
        endereco="",
        responsavel="Resp",
        email=f"{suffix}@example.com",
        telefone="",
        status=InstituicaoStatus.ACTIVE,
    )


def _actor(instituicao: Instituicao) -> Usuario:
    return Usuario(
        instituicao_id=instituicao.id,
        nome="Admin",
        email=f"admin-{instituicao.codigo}@example.com",
        hashed_password="x",
        role=UsuarioRole.INSTITUICAO_ADMIN,
    )


async def _criar(
    session: AsyncSession,
    actor: Usuario,
    *,
    titulo: str,
    datas: list[date] | None,
    status: CursoStatus = CursoStatus.UPCOMING,
) -> Curso:
    payload = CursoCreate(
        titulo=titulo,
        status=status,
        datas_evento=datas,
        exigir_conclusao_para_emitir=False,
    )
    response = await CursoService(session).create(payload, actor=actor)
    curso = await session.get(Curso, response.id)
    assert curso is not None
    return curso


@pytest.mark.asyncio
async def test_criacao_edicao_e_copia_da_data_legada(session: AsyncSession) -> None:
    presente = await session.execute(text("SELECT to_regclass('public.curso_datas')"))
    if presente.scalar_one() is None:
        pytest.skip("Migration 017 ainda não foi aplicada")

    suffix = uuid.uuid4().hex[:12]
    instituicao = _instituicao(suffix)
    session.add(instituicao)
    await session.flush()
    actor = _actor(instituicao)

    curso = await _criar(
        session,
        actor,
        titulo="Com datas",
        datas=[date(2026, 5, 25), date(2026, 5, 20)],
    )
    assert curso.data_evento == date(2026, 5, 20)
    salvas = (
        await session.scalars(
            select(CursoData.data).where(CursoData.curso_id == curso.id).order_by(CursoData.data)
        )
    ).all()
    assert list(salvas) == [date(2026, 5, 20), date(2026, 5, 25)]

    atualizado = await CursoService(session).update(
        curso.id,
        CursoUpdate(datas_evento=[date(2026, 6, 2), date(2026, 6, 1)]),
        actor=actor,
    )
    assert atualizado.data_evento == date(2026, 6, 1)
    assert atualizado.datas_evento == [date(2026, 6, 1), date(2026, 6, 2)]

    legado = Curso(
        instituicao_id=instituicao.id,
        titulo="Legado",
        data_evento=date(2026, 4, 1),
    )
    session.add(legado)
    await session.flush()
    await session.execute(text("DELETE FROM curso_datas WHERE curso_id = :id"), {"id": legado.id})
    await session.execute(
        text(
            """
            INSERT INTO curso_datas (id, curso_id, data)
            SELECT gen_random_uuid(), id, data_evento
            FROM cursos
            WHERE id = :id AND data_evento IS NOT NULL
            """
        ),
        {"id": legado.id},
    )
    copiada = (
        await session.scalars(select(CursoData.data).where(CursoData.curso_id == legado.id))
    ).all()
    assert list(copiada) == [date(2026, 4, 1)]


@pytest.mark.asyncio
async def test_isolamento_ordenacao_e_resposta_publica(session: AsyncSession) -> None:
    suffix_a = uuid.uuid4().hex[:12]
    suffix_b = uuid.uuid4().hex[:12]
    inst_a = _instituicao(suffix_a)
    inst_b = _instituicao(suffix_b)
    session.add_all([inst_a, inst_b])
    await session.flush()
    actor_a = _actor(inst_a)
    actor_b = _actor(inst_b)

    cedo = await _criar(
        session,
        actor_a,
        titulo="Cedo",
        datas=[date(2026, 3, 10), date(2026, 3, 12)],
    )
    tarde = await _criar(session, actor_a, titulo="Tarde", datas=[date(2026, 8, 1)])
    sem_data = await _criar(session, actor_a, titulo="Sem data", datas=[])

    with pytest.raises(NotFoundError):
        await CursoService(session).get(cedo.id, actor=actor_b)

    publicos = await PublicoService(session).list_cursos(limit=500)
    nossos = [item for item in publicos if item.id in {cedo.id, tarde.id, sem_data.id}]
    assert [item.id for item in nossos] == [cedo.id, tarde.id, sem_data.id]
    assert nossos[0].datas_evento == [date(2026, 3, 10), date(2026, 3, 12)]
    assert nossos[0].data_evento == date(2026, 3, 10)
    assert nossos[2].datas_evento == []
    assert nossos[2].data_evento is None


@pytest.mark.asyncio
async def test_snapshot_nao_muda_sem_flag_e_atualiza_com_flag(session: AsyncSession) -> None:
    suffix = uuid.uuid4().hex[:12]
    instituicao = _instituicao(suffix)
    session.add(instituicao)
    await session.flush()
    actor = _actor(instituicao)
    participante = Participante(
        instituicao_id=instituicao.id,
        nome="Aluno",
        email=f"{suffix}@aluno.com",
        documento=suffix,
        status=ParticipanteStatus.VERIFIED,
    )
    session.add(participante)
    await session.flush()

    curso = await _criar(
        session,
        actor,
        titulo="Emitido",
        datas=[date(2026, 5, 20)],
    )
    emitido = await CertificadoService(session).emitir(
        CertificadoEmitRequest(
            participante_id=participante.id,
            curso_id=curso.id,
        ),
        actor=actor,
    )
    certificado = await session.get(Certificado, emitido.id)
    assert certificado is not None
    assert list(certificado.datas_evento) == [date(2026, 5, 20)]

    await CursoService(session).update(
        curso.id,
        CursoUpdate(datas_evento=[date(2026, 7, 1), date(2026, 7, 2)]),
        actor=actor,
    )
    await session.refresh(certificado)
    assert list(certificado.datas_evento) == [date(2026, 5, 20)]

    html_antigo = PdfService().render_certificado_html(
        PdfService().data_from_certificado(certificado, datas_evento=list(certificado.datas_evento))
    )
    assert "O evento foi realizado em 20/05/2026." in html_antigo

    await CursoService(session).update(
        curso.id,
        CursoUpdate(
            datas_evento=[date(2026, 7, 1), date(2026, 7, 2)],
            atualizar_certificados_emitidos=True,
        ),
        actor=actor,
    )
    await session.refresh(certificado)
    assert list(certificado.datas_evento) == [date(2026, 7, 1), date(2026, 7, 2)]


def test_template_usa_texto_formatado() -> None:
    html = PdfService().render_certificado_html(
        PdfService.preview_data(
            template_id="classic",
            participante_nome="Ana",
            curso_titulo="Curso",
            instituicao_nome="Inst",
            carga_horaria=8,
            instrutor="Prof",
            datas_evento=[date(2026, 5, 20), date(2026, 5, 22), date(2026, 5, 25)],
        )
    )
    assert "O evento foi realizado nos dias 20/05/2026, 22/05/2026 e 25/05/2026." in html
    assert "na data de" not in html
