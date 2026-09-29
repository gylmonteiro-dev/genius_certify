"""Profissionais do evento e a regra de exibição no certificado.

A frente separa instituição emissora, assinatura autorizada e, no máximo,
uma pessoa. Duas ou mais pessoas saem da frente e vão para uma seção própria
do verso. O texto legado de ``instrutor`` não é dividido por vírgulas.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date

from fastapi import status

from app.core.exceptions import AppError
from app.models.curso_colaborador import ColaboradorFuncao, ExibicaoColaboradores

MAX_COLABORADORES = 40
MAX_NOME = 255
MAX_FUNCAO_PERSONALIZADA = 80
MAX_TEMA = 180
FRENTE_MAX_CARACTERES = 40
LIMIAR_UMA_COLUNA = 6
FONTE_MIN_PX = 11
ALTURA_UTIL_MM = 150.0
MM_TITULO_SECAO = 8.0
MM_CABECALHO_DATA = 6.0
MM_LINHA = 5.6
MM_TITULO_BLOCO = 8.0
CHARS_POR_LINHA_VERSO = 90

ROTULOS_FUNCAO: dict[str, str] = {
    ColaboradorFuncao.INSTRUTOR.value: "Instrutor",
    ColaboradorFuncao.PALESTRANTE.value: "Palestrante",
    ColaboradorFuncao.FACILITADOR.value: "Facilitador",
    ColaboradorFuncao.MEDIADOR.value: "Mediador",
}


@dataclass(frozen=True)
class ColaboradorSpec:
    nome: str
    funcao: str
    funcao_personalizada: str | None
    tema_atividade: str | None
    ordem: int
    datas_evento: tuple[date, ...]


@dataclass(frozen=True)
class GrupoVerso:
    data_label: str | None
    linhas: tuple[str, ...]


@dataclass(frozen=True)
class ExibicaoCertificado:
    frente_nome: str
    frente_funcao: str
    grupos: tuple[GrupoVerso, ...]
    colunas: int
    tem_verso: bool

    def template_context(self) -> dict[str, object]:
        return {
            "frente_colaborador_nome": self.frente_nome,
            "frente_colaborador_funcao": self.frente_funcao,
            "colaboradores_grupos": [
                {"data_label": grupo.data_label, "linhas": list(grupo.linhas)}
                for grupo in self.grupos
            ],
            "colaboradores_colunas": self.colunas,
            "tem_colaboradores_verso": self.tem_verso,
        }


EXIBICAO_VAZIA = ExibicaoCertificado(
    frente_nome="",
    frente_funcao="",
    grupos=(),
    colunas=1,
    tem_verso=False,
)


def _erro(message: str) -> AppError:
    return AppError(message, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)


def rotulo_funcao(funcao: str, funcao_personalizada: str | None) -> str:
    if funcao == ColaboradorFuncao.OUTRA.value:
        return (funcao_personalizada or "").strip() or "Outra"
    return ROTULOS_FUNCAO.get(funcao, funcao)


def formatar_linha(pessoa: ColaboradorSpec) -> str:
    if pessoa.tema_atividade:
        return f"{pessoa.nome} — “{pessoa.tema_atividade}”"
    return f"{pessoa.nome} — {rotulo_funcao(pessoa.funcao, pessoa.funcao_personalizada)}"


def cabe_na_frente(nome: str) -> bool:
    texto = nome.strip()
    return bool(texto) and "\n" not in texto and len(texto) <= FRENTE_MAX_CARACTERES


def spec_legado(texto: str) -> ColaboradorSpec:
    """Um único registro com o texto original, sem partir por vírgula."""
    return ColaboradorSpec(
        nome=texto,
        funcao=ColaboradorFuncao.INSTRUTOR.value,
        funcao_personalizada=None,
        tema_atividade=None,
        ordem=0,
        datas_evento=(),
    )


def normalizar_colaboradores(
    itens: list[object],
    *,
    datas_validas: set[date],
) -> list[ColaboradorSpec]:
    if len(itens) > MAX_COLABORADORES:
        raise _erro(
            f"O evento aceita no máximo {MAX_COLABORADORES} instrutores e palestrantes."
        )

    preparados: list[tuple[int, int, ColaboradorSpec]] = []
    for index, item in enumerate(itens):
        nome = _campo(item, "nome")
        nome = _texto(nome)
        if not nome:
            raise _erro(f"Informe o nome do profissional {index + 1}.")
        if len(nome) > MAX_NOME:
            raise _erro(f"O nome de {nome} excede {MAX_NOME} caracteres.")

        funcao = _funcao(_campo(item, "funcao"))
        personalizada = _texto(_campo(item, "funcao_personalizada"))
        if funcao == ColaboradorFuncao.OUTRA.value:
            if not personalizada:
                raise _erro(f"Informe a função personalizada de {nome}.")
            if len(personalizada) > MAX_FUNCAO_PERSONALIZADA:
                raise _erro(
                    f"A função personalizada de {nome} excede "
                    f"{MAX_FUNCAO_PERSONALIZADA} caracteres."
                )
        else:
            personalizada = None

        tema = _texto(_campo(item, "tema_atividade")) or None
        if tema and len(tema) > MAX_TEMA:
            raise _erro(f"O tema de {nome} excede {MAX_TEMA} caracteres.")

        datas = _datas_da_pessoa(
            _campo(item, "datas_evento"),
            nome=nome,
            datas_validas=datas_validas,
        )
        ordem_bruta = _campo(item, "ordem")
        ordem = index if ordem_bruta is None else int(ordem_bruta)
        if ordem < 0:
            raise _erro(f"A ordem de {nome} não pode ser negativa.")
        preparados.append(
            (
                ordem,
                index,
                ColaboradorSpec(
                    nome=nome,
                    funcao=funcao,
                    funcao_personalizada=personalizada,
                    tema_atividade=tema,
                    ordem=ordem,
                    datas_evento=datas,
                ),
            )
        )

    preparados.sort(key=lambda item: (item[0], item[1]))
    return [
        ColaboradorSpec(
            nome=spec.nome,
            funcao=spec.funcao,
            funcao_personalizada=spec.funcao_personalizada,
            tema_atividade=spec.tema_atividade,
            ordem=posicao,
            datas_evento=spec.datas_evento,
        )
        for posicao, (_ordem, _index, spec) in enumerate(preparados)
    ]


def derivar_instrutor(pessoas: list[ColaboradorSpec]) -> str:
    """Texto compatível. Listas que não cabem em 255 caracteres não são cortadas."""
    if not pessoas:
        return ""
    if len(pessoas) == 1:
        return pessoas[0].nome[:MAX_NOME]
    joined = ", ".join(pessoa.nome for pessoa in pessoas)
    if len(joined) <= MAX_NOME:
        return joined
    return ""


def snapshot_de_specs(pessoas: list[ColaboradorSpec]) -> list[dict[str, object]]:
    return [
        {
            "nome": pessoa.nome,
            "funcao": pessoa.funcao,
            "funcao_personalizada": pessoa.funcao_personalizada,
            "tema_atividade": pessoa.tema_atividade,
            "ordem": pessoa.ordem,
            "datas_evento": [dia.isoformat() for dia in pessoa.datas_evento],
        }
        for pessoa in pessoas
    ]


def specs_de_snapshot(raw: object) -> list[ColaboradorSpec] | None:
    """None preserva o fallback legado. Lista vazia significa ausência explícita."""
    if raw is None:
        return None
    if not isinstance(raw, list):
        return None
    pessoas: list[ColaboradorSpec] = []
    for index, item in enumerate(raw):
        if not isinstance(item, dict):
            continue
        nome = _texto(item.get("nome"))
        if not nome:
            continue
        funcao = item.get("funcao")
        if funcao not in {member.value for member in ColaboradorFuncao}:
            funcao = ColaboradorFuncao.INSTRUTOR.value
        personalizada = _texto(item.get("funcao_personalizada")) or None
        if funcao != ColaboradorFuncao.OUTRA.value:
            personalizada = None
        tema = _texto(item.get("tema_atividade")) or None
        try:
            ordem = int(item.get("ordem", index))
        except (TypeError, ValueError):
            ordem = index
        datas: list[date] = []
        for valor in item.get("datas_evento") or []:
            if isinstance(valor, date):
                dia = valor
            else:
                try:
                    dia = date.fromisoformat(str(valor)[:10])
                except ValueError:
                    continue
            if dia not in datas:
                datas.append(dia)
        pessoas.append(
            ColaboradorSpec(
                nome=nome,
                funcao=str(funcao),
                funcao_personalizada=personalizada,
                tema_atividade=tema,
                ordem=ordem,
                datas_evento=tuple(sorted(datas)),
            )
        )
    pessoas.sort(key=lambda pessoa: pessoa.ordem)
    return pessoas


def specs_do_curso(curso: object) -> list[ColaboradorSpec]:
    registros = list(getattr(curso, "colaboradores", []) or [])
    pessoas: list[ColaboradorSpec] = []
    for item in registros:
        funcao = item.funcao.value if isinstance(item.funcao, ColaboradorFuncao) else str(item.funcao)
        datas = tuple(sorted(item.datas_evento))
        pessoas.append(
            ColaboradorSpec(
                nome=item.nome,
                funcao=funcao,
                funcao_personalizada=item.funcao_personalizada,
                tema_atividade=item.tema_atividade,
                ordem=item.ordem,
                datas_evento=datas,
            )
        )
    pessoas.sort(key=lambda pessoa: pessoa.ordem)
    return pessoas


def exibicao_de_pessoas(
    pessoas: list[ColaboradorSpec],
    modo: str | ExibicaoColaboradores | None,
    *,
    legado: bool = False,
) -> ExibicaoCertificado:
    modo_valor = _modo(modo)
    if modo_valor == ExibicaoColaboradores.NAO_EXIBIR.value or not pessoas:
        return EXIBICAO_VAZIA

    if (
        modo_valor == ExibicaoColaboradores.AUTOMATICO.value
        and len(pessoas) == 1
        and cabe_na_frente(pessoas[0].nome)
    ):
        pessoa = pessoas[0]
        if legado:
            funcao = "Instrutor(a)"
        elif pessoa.tema_atividade:
            funcao = f"“{pessoa.tema_atividade}”"
        else:
            funcao = rotulo_funcao(pessoa.funcao, pessoa.funcao_personalizada)
        return ExibicaoCertificado(
            frente_nome=pessoa.nome.strip(),
            frente_funcao=funcao,
            grupos=(),
            colunas=1,
            tem_verso=False,
        )

    if legado and len(pessoas) == 1:
        grupos = (GrupoVerso(data_label=None, linhas=(pessoas[0].nome,)),)
    else:
        grupos = tuple(_agrupar(pessoas))
    total = sum(len(grupo.linhas) for grupo in grupos)
    return ExibicaoCertificado(
        frente_nome="",
        frente_funcao="",
        grupos=grupos,
        colunas=1 if total <= LIMIAR_UMA_COLUNA else 2,
        tem_verso=total > 0,
    )


def exibicao_legada(instrutor: str | None) -> ExibicaoCertificado:
    texto = (instrutor or "").strip()
    if not texto:
        return EXIBICAO_VAZIA
    return exibicao_de_pessoas([spec_legado(texto)], ExibicaoColaboradores.AUTOMATICO, legado=True)


def estimar_altura_mm(
    exibicao: ExibicaoCertificado,
    *,
    verso_parcerias: str | None = None,
    verso_conteudos: str | None = None,
    verso_observacoes: str | None = None,
) -> float:
    altura = 0.0
    for texto in (verso_parcerias, verso_conteudos, verso_observacoes):
        altura += _mm_bloco(texto)
    if not exibicao.tem_verso:
        return altura
    altura += MM_TITULO_SECAO
    for grupo in exibicao.grupos:
        if grupo.data_label:
            altura += MM_CABECALHO_DATA
        linhas = len(grupo.linhas)
        fileiras = math.ceil(linhas / exibicao.colunas) if linhas else 0
        altura += fileiras * MM_LINHA
    return altura


def assert_cabe_no_certificado(
    pessoas: list[ColaboradorSpec],
    modo: str | ExibicaoColaboradores | None,
    *,
    verso_parcerias: str | None = None,
    verso_conteudos: str | None = None,
    verso_observacoes: str | None = None,
) -> None:
    exibicao = exibicao_de_pessoas(pessoas, modo)
    altura = estimar_altura_mm(
        exibicao,
        verso_parcerias=verso_parcerias,
        verso_conteudos=verso_conteudos,
        verso_observacoes=verso_observacoes,
    )
    if altura > ALTURA_UTIL_MM:
        raise _erro(
            "A lista de instrutores e palestrantes não cabe no verso do "
            "certificado no tamanho mínimo legível. Reduza a quantidade, "
            "os temas ou os textos do verso."
        )


def canonico_para_hash(pessoas: list[ColaboradorSpec], modo: str | None) -> str:
    partes = [
        "|".join(
            [
                pessoa.nome,
                pessoa.funcao,
                pessoa.funcao_personalizada or "",
                pessoa.tema_atividade or "",
                str(pessoa.ordem),
                ",".join(dia.isoformat() for dia in pessoa.datas_evento),
            ]
        )
        for pessoa in pessoas
    ]
    return f"{_modo(modo)}#{';'.join(partes)}"


def _agrupar(pessoas: list[ColaboradorSpec]) -> list[GrupoVerso]:
    com_data: dict[date, list[tuple[int, str]]] = {}
    sem_data: list[tuple[int, str]] = []
    for pessoa in pessoas:
        linha = formatar_linha(pessoa)
        if pessoa.datas_evento:
            for dia in pessoa.datas_evento:
                com_data.setdefault(dia, []).append((pessoa.ordem, linha))
        else:
            sem_data.append((pessoa.ordem, linha))

    grupos: list[GrupoVerso] = []
    for dia in sorted(com_data):
        linhas = tuple(texto for _ordem, texto in sorted(com_data[dia], key=lambda item: item[0]))
        grupos.append(GrupoVerso(data_label=dia.strftime("%d/%m/%Y"), linhas=linhas))
    if sem_data:
        linhas = tuple(texto for _ordem, texto in sorted(sem_data, key=lambda item: item[0]))
        grupos.append(GrupoVerso(data_label=None, linhas=linhas))
    return grupos


def _mm_bloco(texto: str | None) -> float:
    if texto is None or not texto.strip():
        return 0.0
    linhas = 0
    for paragrafo in texto.splitlines():
        linhas += max(1, math.ceil(len(paragrafo) / CHARS_POR_LINHA_VERSO))
    return MM_TITULO_BLOCO + linhas * MM_LINHA


def _campo(item: object, nome: str) -> object:
    if isinstance(item, dict):
        return item.get(nome)
    return getattr(item, nome, None)


def _texto(value: object) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _funcao(value: object) -> str:
    if isinstance(value, ColaboradorFuncao):
        return value.value
    bruto = _texto(value)
    validos = {item.value for item in ColaboradorFuncao}
    if bruto not in validos:
        raise _erro("Função do profissional inválida.")
    return bruto


def _modo(value: str | ExibicaoColaboradores | None) -> str:
    if isinstance(value, ExibicaoColaboradores):
        return value.value
    bruto = (value or ExibicaoColaboradores.AUTOMATICO.value).strip()
    validos = {item.value for item in ExibicaoColaboradores}
    if bruto not in validos:
        return ExibicaoColaboradores.AUTOMATICO.value
    return bruto


def _datas_da_pessoa(
    value: object,
    *,
    nome: str,
    datas_validas: set[date],
) -> tuple[date, ...]:
    if not value:
        return ()
    if not isinstance(value, (list, tuple)):
        raise _erro(f"As datas de {nome} são inválidas.")
    datas: list[date] = []
    for item in value:
        if isinstance(item, date):
            dia = item
        else:
            try:
                dia = date.fromisoformat(str(item)[:10])
            except ValueError as exc:
                raise _erro(f"A data de {nome} é inválida.") from exc
        if dia not in datas_validas:
            raise _erro(
                f"A data {dia.strftime('%d/%m/%Y')} de {nome} não faz parte do evento."
            )
        if dia not in datas:
            datas.append(dia)
    return tuple(sorted(datas))
