import uuid
from datetime import date
from pathlib import Path

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.config import get_settings
from app.core.exceptions import NotFoundError
from app.models.certificado import Certificado
from app.models.curso_colaborador import ColaboradorFuncao, CursoColaborador
from app.models.instituicao import Instituicao, InstituicaoStatus
from app.models.participante import Participante, ParticipanteStatus
from app.models.usuario import Usuario, UsuarioRole
from app.schemas.certificado import CertificadoEmitRequest
from app.schemas.curso import ColaboradorInput, CursoCreate, CursoUpdate
from app.services.certificado_service import CertificadoService
from app.services.curso_service import CursoService
from app.services.pdf_service import PdfService

PREVIEW_DIR = Path(__file__).resolve().parents[1] / "tmp" / "colaboradores-preview"


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


def _pessoa(
    nome: str,
    funcao: ColaboradorFuncao = ColaboradorFuncao.INSTRUTOR,
    **kwargs: object,
) -> ColaboradorInput:
    return ColaboradorInput(nome=nome, funcao=funcao, **kwargs)  # type: ignore[arg-type]


async def _exige_tabela(session: AsyncSession) -> None:
    presente = await session.execute(text("SELECT to_regclass('public.curso_colaboradores')"))
    if presente.scalar_one() is None:
        pytest.skip("Migration 018 ainda não foi aplicada")


@pytest.mark.asyncio
async def test_cadastro_funcoes_datas_ordem_e_isolamento(session: AsyncSession) -> None:
    await _exige_tabela(session)
    suffix_a = uuid.uuid4().hex[:12]
    suffix_b = uuid.uuid4().hex[:12]
    inst_a = _instituicao(suffix_a)
    inst_b = _instituicao(suffix_b)
    session.add_all([inst_a, inst_b])
    await session.flush()
    actor_a = _actor(inst_a)
    actor_b = _actor(inst_b)
    dia = date(2026, 2, 24)
    outro = date(2026, 2, 25)

    criado = await CursoService(session).create(
        CursoCreate(
            titulo="Encontro",
            status="upcoming",  # type: ignore[arg-type]
            datas_evento=[dia, outro],
            exigir_conclusao_para_emitir=False,
            colaboradores=[
                _pessoa("Segundo", ordem=1, tema_atividade="Encerramento"),
                _pessoa(
                    "Eloiza Lima",
                    ColaboradorFuncao.PALESTRANTE,
                    ordem=0,
                    tema_atividade="Cuide-se professor",
                    datas_evento=[dia, outro],
                ),
                _pessoa(
                    "Lia",
                    ColaboradorFuncao.OUTRA,
                    funcao_personalizada="coordenadora",
                    ordem=2,
                ),
            ],
        ),
        actor=actor_a,
    )
    assert [item.nome for item in criado.colaboradores] == ["Eloiza Lima", "Segundo", "Lia"]
    assert criado.colaboradores[0].funcao == ColaboradorFuncao.PALESTRANTE
    assert criado.colaboradores[0].datas_evento == [dia, outro]
    assert criado.colaboradores[2].funcao_personalizada == "coordenadora"
    assert "Eloiza Lima" in criado.instrutor

    with pytest.raises(NotFoundError):
        await CursoService(session).update(
            criado.id,
            CursoUpdate(colaboradores=[_pessoa("Invasor")]),
            actor=actor_b,
        )

    reordenado = await CursoService(session).update(
        criado.id,
        CursoUpdate(
            colaboradores=[
                _pessoa("Lia", ColaboradorFuncao.OUTRA, funcao_personalizada="coordenadora", ordem=0),
                _pessoa("Eloiza Lima", ColaboradorFuncao.PALESTRANTE, ordem=1, datas_evento=[outro]),
            ]
        ),
        actor=actor_a,
    )
    assert [item.nome for item in reordenado.colaboradores] == ["Lia", "Eloiza Lima"]
    assert reordenado.colaboradores[1].datas_evento == [outro]


@pytest.mark.asyncio
async def test_migration_preserva_texto_legado_sem_dividir(session: AsyncSession) -> None:
    await _exige_tabela(session)
    suffix = uuid.uuid4().hex[:12]
    instituicao = _instituicao(suffix)
    session.add(instituicao)
    await session.flush()
    actor = _actor(instituicao)
    criado = await CursoService(session).create(
        CursoCreate(titulo="Antigo", exigir_conclusao_para_emitir=False),
        actor=actor,
    )
    texto = "Eloiza Lima, palestrante, Cuide-se professor, Mistênio Bertuleza"
    await session.execute(
        text("DELETE FROM curso_colaboradores WHERE curso_id = :id"),
        {"id": criado.id},
    )
    await session.execute(
        text("UPDATE cursos SET instrutor = :texto WHERE id = :id"),
        {"id": criado.id, "texto": texto},
    )
    await session.execute(
        text(
            """
            INSERT INTO curso_colaboradores (
                id, curso_id, nome, funcao, funcao_personalizada,
                tema_atividade, ordem, created_at, updated_at
            )
            SELECT
                gen_random_uuid(), id, instrutor, 'instrutor'::colaborador_funcao,
                NULL, NULL, 0, now(), now()
            FROM cursos
            WHERE id = :id
              AND instrutor IS NOT NULL
              AND btrim(instrutor) <> ''
            """
        ),
        {"id": criado.id},
    )
    nomes = (
        await session.scalars(
            select(CursoColaborador.nome).where(CursoColaborador.curso_id == criado.id)
        )
    ).all()
    assert list(nomes) == [texto]


@pytest.mark.asyncio
async def test_snapshot_nao_segue_edicao_e_atualiza_quando_marcado(
    session: AsyncSession,
) -> None:
    await _exige_tabela(session)
    suffix = uuid.uuid4().hex[:12]
    instituicao = _instituicao(suffix)
    session.add(instituicao)
    await session.flush()
    actor = _actor(instituicao)
    participante = Participante(
        instituicao_id=instituicao.id,
        nome="Aluno",
        email=f"{suffix}@aluno.com",
        documento="52998224725",
        status=ParticipanteStatus.VERIFIED,
    )
    session.add(participante)
    await session.flush()
    curso = await CursoService(session).create(
        CursoCreate(
            titulo="Emitido",
            status="upcoming",  # type: ignore[arg-type]
            exigir_conclusao_para_emitir=False,
            colaboradores=[_pessoa("Eloiza Lima", ColaboradorFuncao.PALESTRANTE)],
        ),
        actor=actor,
    )
    emitido = await CertificadoService(session).emitir(
        CertificadoEmitRequest(participante_id=participante.id, curso_id=curso.id),
        actor=actor,
    )
    certificado = await session.get(Certificado, emitido.id)
    assert certificado is not None
    assert certificado.colaboradores[0]["nome"] == "Eloiza Lima"

    await CursoService(session).update(
        curso.id,
        CursoUpdate(colaboradores=[_pessoa("Outra Pessoa")]),
        actor=actor,
    )
    await session.refresh(certificado)
    assert certificado.colaboradores[0]["nome"] == "Eloiza Lima"

    await CursoService(session).update(
        curso.id,
        CursoUpdate(
            colaboradores=[_pessoa("Outra Pessoa", ColaboradorFuncao.MEDIADOR)],
            atualizar_certificados_emitidos=True,
        ),
        actor=actor,
    )
    await session.refresh(certificado)
    assert certificado.colaboradores[0]["nome"] == "Outra Pessoa"
    assert certificado.colaboradores[0]["funcao"] == "mediador"

    certificado.colaboradores = None
    certificado.exibicao_colaboradores = None
    certificado.instrutor = "Ana Costa, Dr. Paulo Lima, palestrante convidado"
    html = PdfService().render_certificado_html(
        PdfService().data_from_certificado(certificado, datas_evento=[])
    )
    assert "Ana Costa, Dr. Paulo Lima, palestrante convidado" in html
    frente = html.split('class="page verso"', 1)[0]
    assert "Ana Costa, Dr. Paulo Lima" not in frente


@pytest.mark.asyncio
async def test_gera_pdfs_de_zero_um_cinco_e_dez(session: AsyncSession) -> None:
    await _exige_tabela(session)
    from app.services.colaboradores_evento import ColaboradorSpec

    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    quantidades = (0, 1, 5, 10)
    service = PdfService()
    for template_id in ("classic", "excelencia"):
        for quantidade in quantidades:
            pessoas = tuple(
                ColaboradorSpec(
                    nome=f"Palestrante {index:02d}",
                    funcao="palestrante",
                    funcao_personalizada=None,
                    tema_atividade="Tema" if index % 2 == 0 else None,
                    ordem=index,
                    datas_evento=(date(2026, 2, 24),) if index < 3 else (),
                )
                for index in range(quantidade)
            )
            data = PdfService.preview_data(
                template_id=template_id,
                participante_nome="Participante Exemplo",
                curso_titulo="Simpósio de formação",
                instituicao_nome="Nexus Genius",
                carga_horaria=16,
                instrutor="",
                colaboradores=pessoas,
                exibicao_colaboradores="automatico",
                datas_evento=[date(2026, 2, 24), date(2026, 2, 25)],
            )
            html = service.render_certificado_html(data)
            pdf = service.render_certificado_pdf(data)
            stem = PREVIEW_DIR / f"{template_id}-{quantidade:02d}"
            stem.with_suffix(".html").write_text(html, encoding="utf-8")
            stem.with_suffix(".pdf").write_bytes(pdf)
            assert pdf.startswith(b"%PDF")
            if quantidade >= 2:
                assert "Instrutores e palestrantes" in html
                assert f"Palestrante {quantidade - 1:02d}" not in html.split('class="page verso"', 1)[0]
