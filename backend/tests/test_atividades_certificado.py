from datetime import date, time

from app.models.curso_atividade import AtividadeStatus, InscricaoAtividadeStatus
from app.services.atividades_certificado import (
    carga_horaria_entre,
    elegivel_para_certificado,
    formatar_linha_atividade,
    linhas_de_snapshot,
)
from app.services.pdf_service import PdfService


def test_carga_horaria_sai_do_horario_e_pode_ficar_vazia() -> None:
    assert carga_horaria_entre(time(8, 0), time(9, 30)) == 2
    assert carga_horaria_entre(time(8, 0), time(9, 0)) == 1
    assert carga_horaria_entre(time(8, 0), time(8, 20)) == 1
    assert carga_horaria_entre(time(10, 0), time(9, 0)) is None
    assert carga_horaria_entre(None, time(9, 0)) is None


def test_linha_com_carga_e_responsavel() -> None:
    linha = formatar_linha_atividade(
        {
            "titulo": "Oficina de estratégias de aplicação",
            "tipo": "oficina",
            "data": "2026-10-07",
            "carga_horaria": 2,
            "responsaveis": [
                {"nome": "Ana Paula", "funcao": "instrutor", "funcao_personalizada": None}
            ],
        }
    )
    assert linha == (
        "Oficina de estratégias de aplicação — 07/10/2026 — 2h — Instrutor: Ana Paula"
    )


def test_linha_sem_carga_nao_inventa_horas() -> None:
    linha = formatar_linha_atividade(
        {
            "titulo": "BNCC na prática",
            "tipo": "palestra",
            "data": date(2026, 10, 8),
            "carga_horaria": None,
            "responsaveis": [
                {"nome": "Gyl Monteiro", "funcao": "palestrante", "funcao_personalizada": None}
            ],
        }
    )
    assert linha == "BNCC na prática — Palestra — 08/10/2026 — Palestrante: Gyl Monteiro"


def test_elegibilidade_separa_selecao_de_presenca() -> None:
    assert elegivel_para_certificado(
        status=InscricaoAtividadeStatus.SELECIONADA,
        certificado_habilitado=True,
        atividade_status=AtividadeStatus.ATIVA,
        exige_presenca=False,
    )
    assert not elegivel_para_certificado(
        status=InscricaoAtividadeStatus.SELECIONADA,
        certificado_habilitado=True,
        atividade_status=AtividadeStatus.ATIVA,
        exige_presenca=True,
    )
    assert elegivel_para_certificado(
        status=InscricaoAtividadeStatus.PRESENTE,
        certificado_habilitado=True,
        atividade_status=AtividadeStatus.ENCERRADA,
        exige_presenca=True,
    )
    assert not elegivel_para_certificado(
        status=InscricaoAtividadeStatus.AUSENTE,
        certificado_habilitado=False,
        atividade_status=AtividadeStatus.ATIVA,
        exige_presenca=False,
    )
    assert not elegivel_para_certificado(
        status=InscricaoAtividadeStatus.PRESENTE,
        certificado_habilitado=True,
        atividade_status=AtividadeStatus.CANCELADA,
        exige_presenca=False,
    )


def test_verso_so_aparece_com_atividades() -> None:
    pdf = PdfService()
    vazio = pdf.preview_data(
        template_id="classic",
        participante_nome="Ana",
        curso_titulo="Workshop",
        instituicao_nome="Nexus",
        carga_horaria=8,
        instrutor="",
    )
    html_vazio = pdf.render_certificado_html(vazio)
    assert "Atividades realizadas durante o evento" not in html_vazio
    assert "Workshop" in html_vazio

    com_atividade = pdf.preview_data(
        template_id="excelencia",
        participante_nome="Ana",
        curso_titulo="Workshop",
        instituicao_nome="Nexus",
        carga_horaria=8,
        instrutor="",
        atividades_linhas=tuple(
            linhas_de_snapshot(
                [
                    {
                        "titulo": "Mesa-redonda sobre Educação Midiática",
                        "tipo": "mesa_redonda",
                        "data": "2026-10-07",
                        "carga_horaria": 1,
                        "responsaveis": [
                            {
                                "nome": "Ana Paula",
                                "funcao": "mediador",
                                "funcao_personalizada": None,
                            }
                        ],
                    }
                ]
            )
        ),
        atividades_exemplo=True,
    )
    html = pdf.render_certificado_html(com_atividade)
    assert "Atividades realizadas durante o evento (exemplo)" in html
    assert "Mesa-redonda sobre Educação Midiática — 07/10/2026 — 1h — Mediador: Ana Paula" in html
    assert "Carga horária" in html or "8" in html
