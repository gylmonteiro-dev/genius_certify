import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
import pytest_asyncio
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.config import get_settings
from app.core.exceptions import AppError, ConflictError, NotFoundError
from app.models.certificado import Certificado
from app.models.curso import Curso, CursoStatus
from app.models.curso_atividade import InscricaoAtividade, InscricaoAtividadeStatus
from app.models.curso_colaborador import ColaboradorFuncao
from app.models.inscricao import Inscricao
from app.models.instituicao import Instituicao, InstituicaoStatus
from app.models.participante import Participante, ParticipanteStatus
from app.models.usuario import Usuario, UsuarioRole
from app.schemas.certificado import CertificadoEmitRequest
from app.schemas.curso import ColaboradorInput, CursoCreate, CursoUpdate
from app.schemas.curso_atividade import AtividadeCreate, AtividadeTipo
from app.services.certificado_service import CertificadoService
from app.services.curso_atividade_service import VAGAS_ATIVIDADE, CursoAtividadeService
from app.services.curso_service import CursoService
from app.services.pdf_service import PdfService


@pytest_asyncio.fixture
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


async def _curso(
    session: AsyncSession,
    actor: Usuario,
    *,
    titulo: str = "Workshop",
) -> Curso:
    response = await CursoService(session).create(
        CursoCreate(
            titulo=titulo,
            status=CursoStatus.UPCOMING,
            datas_evento=[date(2026, 10, 7), date(2026, 10, 8)],
            exigir_conclusao_para_emitir=False,
            colaboradores=[
                ColaboradorInput(nome="Ana Paula", funcao=ColaboradorFuncao.INSTRUTOR),
            ],
        ),
        actor=actor,
    )
    curso = await session.get(Curso, response.id)
    assert curso is not None
    return curso


async def _pessoa(
    session: AsyncSession,
    instituicao_id: uuid.UUID,
    nome: str,
) -> Participante:
    participante = Participante(
        instituicao_id=instituicao_id,
        nome=nome,
        email=f"{uuid.uuid4().hex[:8]}@example.com",
        documento=str(uuid.uuid4().int)[:11],
        status=ParticipanteStatus.VERIFIED,
    )
    session.add(participante)
    await session.flush()
    return participante


async def _inscricao(
    session: AsyncSession,
    curso: Curso,
    participante: Participante,
) -> Inscricao:
    inscricao = Inscricao(
        instituicao_id=curso.instituicao_id,
        participante_id=participante.id,
        curso_id=curso.id,
    )
    session.add(inscricao)
    await session.flush()
    return inscricao


def _atividade(colaborador_id: uuid.UUID, **kwargs: object) -> AtividadeCreate:
    base: dict[str, object] = {
        "titulo": "Oficina de estratégias",
        "tipo": AtividadeTipo.OFICINA,
        "data": date(2026, 10, 7),
        "carga_horaria": 2,
        "colaborador_ids": [colaborador_id],
    }
    base.update(kwargs)
    return AtividadeCreate(**base)  # type: ignore[arg-type]


async def _skip_sem_migration(session: AsyncSession) -> None:
    presente = await session.execute(text("SELECT to_regclass('public.curso_atividades')"))
    if presente.scalar_one() is None:
        pytest.skip("Migration 020 ainda não foi aplicada")


@pytest.mark.asyncio
async def test_crud_regras_e_tenant(session: AsyncSession) -> None:
    await _skip_sem_migration(session)
    suffix = uuid.uuid4().hex[:12]
    outro = uuid.uuid4().hex[:12]
    instituicao = _instituicao(suffix)
    vizinha = _instituicao(outro)
    session.add_all([instituicao, vizinha])
    await session.flush()
    actor = _actor(instituicao)
    curso = await _curso(session, actor)
    service = CursoAtividadeService(session)
    colaborador_id = curso.colaboradores[0].id

    with pytest.raises(AppError, match="data da atividade"):
        await service.create(
            curso.id,
            _atividade(colaborador_id, data=date(2026, 1, 1)),
            instituicao_id=instituicao.id,
        )
    with pytest.raises(AppError, match="tipo personalizado"):
        await service.create(
            curso.id,
            _atividade(colaborador_id, tipo=AtividadeTipo.OUTRO, tipo_personalizado=None),
            instituicao_id=instituicao.id,
        )

    criada = await service.create(
        curso.id,
        _atividade(colaborador_id, limite_participantes=2),
        instituicao_id=instituicao.id,
    )
    assert criada.vagas_disponiveis == 2
    assert criada.responsaveis[0].nome == "Ana Paula"
    assert criada.lotada is False

    with pytest.raises(NotFoundError):
        await service.list_admin(curso.id, instituicao_id=vizinha.id)

    with pytest.raises(AppError, match="datas que ainda têm atividade"):
        await CursoService(session).update(
            curso.id,
            CursoUpdate(datas_evento=[date(2026, 10, 8)]),
            actor=actor,
        )


@pytest.mark.asyncio
async def test_selecao_vagas_prazo_e_cancelamento(session: AsyncSession) -> None:
    await _skip_sem_migration(session)
    instituicao = _instituicao(uuid.uuid4().hex[:12])
    session.add(instituicao)
    await session.flush()
    actor = _actor(instituicao)
    curso = await _curso(session, actor)
    service = CursoAtividadeService(session)
    atividade = await service.create(
        curso.id,
        _atividade(curso.colaboradores[0].id, limite_participantes=1),
        instituicao_id=instituicao.id,
    )
    segunda = await service.create(
        curso.id,
        _atividade(
            curso.colaboradores[0].id,
            titulo="Palestra BNCC",
            tipo=AtividadeTipo.PALESTRA,
            data=date(2026, 10, 8),
            carga_horaria=None,
        ),
        instituicao_id=instituicao.id,
    )
    aluno = await _pessoa(session, instituicao.id, "Aluno Um")
    outro = await _pessoa(session, instituicao.id, "Aluno Dois")
    inscricao = await _inscricao(session, curso, aluno)
    inscricao_dois = await _inscricao(session, curso, outro)

    await service.aplicar_selecao(inscricao, [], como_admin=False)
    assert await service.resumos_da_inscricao(inscricao.id) == []

    await service.aplicar_selecao(inscricao, [atividade.id], como_admin=False)
    await service.aplicar_selecao(inscricao, [atividade.id], como_admin=False)
    ativos = (
        await session.scalars(
            select(func.count())
            .select_from(InscricaoAtividade)
            .where(
                InscricaoAtividade.inscricao_id == inscricao.id,
                InscricaoAtividade.status != InscricaoAtividadeStatus.CANCELADA,
            )
        )
    ).one()
    assert ativos == 1

    with pytest.raises(ConflictError, match=VAGAS_ATIVIDADE):
        await service.aplicar_selecao(inscricao_dois, [atividade.id], como_admin=False)

    await service.aplicar_selecao(inscricao, [segunda.id], como_admin=False)
    await service.aplicar_selecao(inscricao_dois, [atividade.id], como_admin=False)
    ocupadas = await service.list_inscritos(
        curso.id,
        atividade.id,
        instituicao_id=instituicao.id,
    )
    assert [item.nome for item in ocupadas] == ["Aluno Dois"]

    curso.selecao_atividades_ate = datetime.now(timezone.utc) - timedelta(minutes=1)
    await session.flush()
    with pytest.raises(ConflictError, match="prazo"):
        await service.aplicar_selecao(inscricao, [atividade.id], como_admin=False)

    await service.cancelar_da_inscricao(inscricao_dois.id)
    lista = await service.list_admin(curso.id, instituicao_id=instituicao.id)
    vaga = next(item for item in lista if item.id == atividade.id)
    assert vaga.vagas_ocupadas == 0
    assert vaga.lotada is False


@pytest.mark.asyncio
async def test_participante_nao_seleciona_atividade_de_outro_curso(
    session: AsyncSession,
) -> None:
    await _skip_sem_migration(session)
    instituicao = _instituicao(uuid.uuid4().hex[:12])
    session.add(instituicao)
    await session.flush()
    actor = _actor(instituicao)
    curso = await _curso(session, actor, titulo="Evento A")
    outro = await _curso(session, actor, titulo="Evento B")
    service = CursoAtividadeService(session)
    atividade_b = await service.create(
        outro.id,
        _atividade(outro.colaboradores[0].id),
        instituicao_id=instituicao.id,
    )
    aluno = await _pessoa(session, instituicao.id, "Aluno")
    inscricao = await _inscricao(session, curso, aluno)
    with pytest.raises(NotFoundError):
        await service.aplicar_selecao(inscricao, [atividade_b.id], como_admin=False)


@pytest.mark.asyncio
async def test_certificado_lista_so_atividades_elegiveis(session: AsyncSession) -> None:
    await _skip_sem_migration(session)
    instituicao = _instituicao(uuid.uuid4().hex[:12])
    session.add(instituicao)
    await session.flush()
    actor = _actor(instituicao)
    session.add(actor)
    await session.flush()
    curso = await _curso(session, actor)
    service = CursoAtividadeService(session)
    atividade = await service.create(
        curso.id,
        _atividade(curso.colaboradores[0].id),
        instituicao_id=instituicao.id,
    )
    aluno = await _pessoa(session, instituicao.id, "Aluno Cert")
    inscricao = await _inscricao(session, curso, aluno)
    await service.aplicar_selecao(inscricao, [atividade.id], como_admin=True)

    emitido = await CertificadoService(session).emitir(
        CertificadoEmitRequest(participante_id=aluno.id, curso_id=curso.id),
        actor=actor,
    )
    certificado = await session.get(Certificado, emitido.id)
    assert certificado is not None
    assert certificado.atividades is not None
    assert certificado.atividades[0]["titulo"] == "Oficina de estratégias"
    html = PdfService().render_certificado_html(
        PdfService().data_from_certificado(certificado)
    )
    assert "Atividades realizadas durante o evento" in html
    assert "Oficina de estratégias — 07/10/2026 — 2h — Instrutor: Ana Paula" in html
    assert "(exemplo)" not in html

    await CursoService(session).update(
        curso.id,
        CursoUpdate(certificado_exige_presenca_atividade=True),
        actor=actor,
    )
    curso_atual = await session.get(Curso, curso.id)
    assert curso_atual is not None
    sem_presenca = await service.snapshot_do_participante(curso_atual, aluno.id)
    assert sem_presenca is None

    await service.registrar_presenca(
        curso.id,
        atividade.id,
        instituicao_id=instituicao.id,
        participante_id=aluno.id,
        status=InscricaoAtividadeStatus.PRESENTE,
    )
    com_presenca = await service.snapshot_do_participante(curso_atual, aluno.id)
    assert com_presenca is not None
    assert com_presenca[0]["status"] == "presente"
