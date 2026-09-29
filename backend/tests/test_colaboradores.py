from datetime import date

import pytest
from pydantic import ValidationError

from app.core.exceptions import AppError
from app.models.curso_colaborador import ColaboradorFuncao, ExibicaoColaboradores
from app.schemas.curso import ColaboradorInput, CursoCreate
from app.services.colaboradores_evento import (
    MAX_COLABORADORES,
    assert_cabe_no_certificado,
    cabe_na_frente,
    derivar_instrutor,
    exibicao_de_pessoas,
    exibicao_legada,
    formatar_linha,
    normalizar_colaboradores,
    spec_legado,
    specs_de_snapshot,
)
from app.services.colaboradores_evento import ColaboradorSpec
from app.services.pdf_service import PdfService


def _pessoa(
    nome: str,
    funcao: str = "instrutor",
    *,
    personalizada: str | None = None,
    tema: str | None = None,
    ordem: int = 0,
    datas: tuple[date, ...] = (),
) -> ColaboradorSpec:
    return ColaboradorSpec(
        nome=nome,
        funcao=funcao,
        funcao_personalizada=personalizada,
        tema_atividade=tema,
        ordem=ordem,
        datas_evento=datas,
    )


def _input(nome: str, funcao: str = "instrutor", **kwargs: object) -> ColaboradorInput:
    return ColaboradorInput(nome=nome, funcao=ColaboradorFuncao(funcao), **kwargs)  # type: ignore[arg-type]


def test_evento_sem_profissional_nao_ocupa_a_frente() -> None:
    exibicao = exibicao_de_pessoas([], ExibicaoColaboradores.AUTOMATICO)
    assert exibicao.frente_nome == ""
    assert exibicao.tem_verso is False


def test_um_instrutor_aparece_na_frente() -> None:
    pessoa = _pessoa("Eloiza Lima", "palestrante")
    exibicao = exibicao_de_pessoas([pessoa], "automatico")
    assert exibicao.frente_nome == "Eloiza Lima"
    assert exibicao.frente_funcao == "Palestrante"
    assert exibicao.tem_verso is False
    com_tema = exibicao_de_pessoas(
        [_pessoa("Eloiza Lima", "palestrante", tema="Cuide-se professor")],
        "automatico",
    )
    assert com_tema.frente_funcao == "“Cuide-se professor”"


def test_varios_instrutores_saem_da_frente() -> None:
    pessoas = [
        _pessoa("Eloiza Lima", "palestrante", ordem=0),
        _pessoa("Mistênio Bertuleza", "instrutor", ordem=1),
    ]
    exibicao = exibicao_de_pessoas(pessoas, "automatico")
    assert exibicao.frente_nome == ""
    assert exibicao.tem_verso is True
    assert exibicao.grupos[0].linhas == (
        "Eloiza Lima — Palestrante",
        "Mistênio Bertuleza — Instrutor",
    )


def test_funcao_personalizada_e_tema() -> None:
    pessoa = _pessoa("Ana", "outra", personalizada="coordenadora", tema="Abertura")
    assert formatar_linha(pessoa) == "Ana — “Abertura”"
    assert normalizar_colaboradores(
        [_input("Ana", "outra", funcao_personalizada="coordenadora")],
        datas_validas=set(),
    )[0].funcao_personalizada == "coordenadora"
    with pytest.raises(AppError):
        normalizar_colaboradores([_input("Ana", "outra")], datas_validas=set())


def test_tema_opcional_e_data_unica_ou_varias() -> None:
    dia_a = date(2026, 2, 24)
    dia_b = date(2026, 2, 25)
    pessoas = normalizar_colaboradores(
        [
            _input(
                "Eloiza Lima",
                "palestrante",
                tema_atividade="Cuide-se professor",
                datas_evento=[dia_a, dia_b],
                ordem=1,
            ),
            _input("Mistênio Bertuleza", "instrutor", ordem=0, datas_evento=[dia_a]),
        ],
        datas_validas={dia_a, dia_b},
    )
    assert [item.nome for item in pessoas] == ["Mistênio Bertuleza", "Eloiza Lima"]
    assert pessoas[1].datas_evento == (dia_a, dia_b)
    assert pessoas[1].tema_atividade == "Cuide-se professor"
    exibicao = exibicao_de_pessoas(pessoas, "automatico")
    assert exibicao.grupos[0].data_label == "24/02/2026"
    assert exibicao.grupos[0].linhas == (
        "Mistênio Bertuleza — Instrutor",
        "Eloiza Lima — “Cuide-se professor”",
    )
    assert exibicao.grupos[1].data_label == "25/02/2026"
    assert exibicao.grupos[1].linhas == ("Eloiza Lima — “Cuide-se professor”",)


def test_data_fora_do_evento_e_reordenacao() -> None:
    with pytest.raises(AppError) as exc:
        normalizar_colaboradores(
            [_input("Ana", datas_evento=[date(2026, 1, 2)])],
            datas_validas={date(2026, 1, 1)},
        )
    assert "não faz parte" in exc.value.message

    pessoas = normalizar_colaboradores(
        [
            _input("Terceira", ordem=2),
            _input("Primeira", ordem=0),
            _input("Segunda", ordem=1),
        ],
        datas_validas=set(),
    )
    assert [item.nome for item in pessoas] == ["Primeira", "Segunda", "Terceira"]
    assert [item.ordem for item in pessoas] == [0, 1, 2]


def test_texto_legado_nao_e_dividido() -> None:
    texto = "Eloiza Lima, palestrante, Cuide-se professor, Mistênio Bertuleza"
    spec = spec_legado(texto)
    assert spec.nome == texto
    assert "," in spec.nome
    assert derivar_instrutor([spec]) == texto
    exibicao = exibicao_legada(texto)
    assert exibicao.frente_nome == ""
    assert exibicao.grupos[0].linhas == (texto,)
    assert cabe_na_frente("Eloiza Lima") is True
    assert cabe_na_frente(texto) is False


def test_modos_somente_verso_e_nao_exibir() -> None:
    pessoa = _pessoa("Eloiza Lima")
    verso = exibicao_de_pessoas([pessoa], "somente_verso")
    assert verso.frente_nome == ""
    assert verso.tem_verso is True
    oculto = exibicao_de_pessoas([pessoa, _pessoa("Outra", ordem=1)], "nao_exibir")
    assert oculto.tem_verso is False
    assert oculto.frente_nome == ""


def test_lista_grande_usa_duas_colunas_sem_encolher_fonte() -> None:
    pessoas = [_pessoa(f"Pessoa {index:02d}", ordem=index) for index in range(10)]
    exibicao = exibicao_de_pessoas(pessoas, "automatico")
    assert exibicao.colunas == 2
    assert exibicao.frente_nome == ""
    assert_cabe_no_certificado(pessoas, "automatico")
    with pytest.raises(AppError):
        assert_cabe_no_certificado(
            [
                _pessoa(f"Pessoa {index}", ordem=index, datas=(date(2026, 1, 1 + index),))
                for index in range(20)
            ],
            "automatico",
        )


def test_limite_de_quantidade() -> None:
    itens = [_input(f"Pessoa {index}") for index in range(MAX_COLABORADORES + 1)]
    with pytest.raises(AppError):
        normalizar_colaboradores(itens, datas_validas=set())
    with pytest.raises(ValidationError):
        CursoCreate(
            titulo="Evento",
            colaboradores=[_input(f"Pessoa {index}") for index in range(MAX_COLABORADORES + 1)],
        )


def test_snapshot_preserva_estrutura_e_vazio_nao_cai_no_legado() -> None:
    pessoas = normalizar_colaboradores(
        [_input("Eloiza Lima", "palestrante", tema_atividade="Cuide-se professor")],
        datas_validas=set(),
    )
    from app.services.colaboradores_evento import snapshot_de_specs

    bruto = snapshot_de_specs(pessoas)
    assert specs_de_snapshot(bruto) == pessoas
    assert specs_de_snapshot(None) is None
    assert specs_de_snapshot([]) == []
    varios = [_pessoa("A", ordem=0), _pessoa("B", ordem=1)]
    assert derivar_instrutor(varios) == "A, B"
    assert derivar_instrutor([_pessoa("N" * 200, ordem=index) for index in range(2)]) == ""


def _html(template_id: str, pessoas: list[ColaboradorSpec], modo: str = "automatico") -> str:
    return PdfService().render_certificado_html(
        PdfService.preview_data(
            template_id=template_id,
            participante_nome="Participante Exemplo",
            curso_titulo="Simpósio",
            instituicao_nome="Nexus Genius",
            carga_horaria=8,
            instrutor="",
            colaboradores=tuple(pessoas),
            exibicao_colaboradores=modo,
            datas_evento=[date(2026, 2, 24)],
        )
    )


def _frente(html: str) -> str:
    return html.split('class="page verso"', 1)[0]


@pytest.mark.parametrize("template_id", ["classic", "excelencia"])
def test_previews_zero_um_cinco_e_dez(template_id: str) -> None:
    vazio = _html(template_id, [])
    assert "Instrutores e palestrantes" not in vazio
    assert "Participante Exemplo" in vazio
    assert "Nexus Genius" in vazio
    assert "signature-script\">" not in vazio or "Nexus Genius" in vazio

    um = _html(template_id, [_pessoa("Eloiza Lima", "palestrante")])
    assert "Eloiza Lima" in _frente(um)
    assert "Instrutores e palestrantes" not in um

    cinco = [_pessoa(f"Pessoa {index}", "facilitador", ordem=index) for index in range(5)]
    html_cinco = _html(template_id, cinco)
    assert "Instrutores e palestrantes" in html_cinco
    assert 'class="colab-list cols-2"' not in html_cinco
    assert "Pessoa 4" not in _frente(html_cinco)

    dez = [_pessoa(f"Palestrante {index:02d}", "palestrante", ordem=index) for index in range(10)]
    html_dez = _html(template_id, dez)
    verso = html_dez.split('class="page verso"', 1)[1]
    frente = _frente(html_dez)
    assert "Instrutores e palestrantes" in verso
    assert 'class="colab-list cols-2"' in verso
    assert "font-size: 11px" in html_dez
    assert "Palestrante 09" in verso
    assert "Palestrante 09" not in frente
    assert "signature-script" not in frente or "Palestrante" not in frente.split("signature-script", 1)[-1][:80]


def test_previews_modos_e_legado() -> None:
    pessoa = _pessoa("Eloiza Lima", "instrutor")
    somente = _html("excelencia", [pessoa], "somente_verso")
    assert "Eloiza Lima" not in _frente(somente)
    assert "Instrutores e palestrantes" in somente

    oculto = _html("classic", [pessoa, _pessoa("Outra", ordem=1)], "nao_exibir")
    assert "Instrutores e palestrantes" not in oculto
    assert "Outra" not in oculto

    legado = PdfService().render_certificado_html(
        PdfService.preview_data(
            template_id="excelencia",
            participante_nome="Aluno",
            curso_titulo="Curso",
            instituicao_nome="Instituição",
            carga_horaria=4,
            instrutor="Ana Costa, Dr. Paulo Lima, palestrante convidado",
        )
    )
    texto = "Ana Costa, Dr. Paulo Lima, palestrante convidado"
    assert texto in legado.split('class="page verso"', 1)[1]
    assert texto not in _frente(legado)
    assert "Instituição emissora" in legado
