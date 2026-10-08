"""Texto e elegibilidade das atividades no verso do certificado.

A carga horária da atividade é informativa. Ela não altera a carga do evento
impressa na frente.
"""

from __future__ import annotations

import json
from datetime import date, time

from app.models.curso_atividade import (
    AtividadeStatus,
    AtividadeTipo,
    InscricaoAtividadeStatus,
)
from app.services.colaboradores_evento import ROTULOS_FUNCAO

ROTULOS_TIPO: dict[str, str] = {
    AtividadeTipo.OFICINA.value: "Oficina",
    AtividadeTipo.PALESTRA.value: "Palestra",
    AtividadeTipo.MINICURSO.value: "Minicurso",
    AtividadeTipo.MESA_REDONDA.value: "Mesa-redonda",
    AtividadeTipo.ATIVIDADE_PRATICA.value: "Atividade prática",
}

STATUS_ELEGIVEIS_SEM_PRESENCA = {
    InscricaoAtividadeStatus.SELECIONADA.value,
    InscricaoAtividadeStatus.CONFIRMADA.value,
    InscricaoAtividadeStatus.PRESENTE.value,
}


def carga_horaria_entre(hora_inicio: time | None, hora_fim: time | None) -> int | None:
    """Horas inteiras entre início e fim. Intervalo positivo vira no mínimo 1h."""
    if hora_inicio is None or hora_fim is None or hora_fim <= hora_inicio:
        return None
    minutos = (hora_fim.hour * 60 + hora_fim.minute) - (
        hora_inicio.hour * 60 + hora_inicio.minute
    )
    if minutos <= 0:
        return None
    return max(1, (minutos + 30) // 60)


def _valor(item: object) -> str:
    return item.value if hasattr(item, "value") else str(item)


def rotulo_tipo(tipo: str, tipo_personalizado: str | None) -> str:
    if tipo == AtividadeTipo.OUTRO.value:
        return (tipo_personalizado or "").strip() or "Outro"
    return ROTULOS_TIPO.get(tipo, tipo)


def rotulo_funcao(funcao: str, personalizada: str | None) -> str:
    if funcao == "outra":
        return (personalizada or "").strip() or "Responsável"
    return ROTULOS_FUNCAO.get(funcao, funcao.replace("_", " ").capitalize())


def formatar_responsaveis(responsaveis: list[dict] | None) -> str:
    partes: list[str] = []
    for pessoa in responsaveis or []:
        nome = str(pessoa.get("nome") or "").strip()
        if not nome:
            continue
        funcao = rotulo_funcao(
            str(pessoa.get("funcao") or ""),
            pessoa.get("funcao_personalizada"),
        )
        partes.append(f"{funcao}: {nome}")
    return "; ".join(partes)


def formatar_linha_atividade(item: dict) -> str:
    titulo = str(item.get("titulo") or "").strip()
    tipo = rotulo_tipo(
        str(item.get("tipo") or ""),
        item.get("tipo_personalizado"),
    )
    partes = [titulo]
    if tipo and not titulo.casefold().startswith(tipo.casefold()):
        partes.append(tipo)
    data = item.get("data")
    if isinstance(data, date):
        partes.append(data.strftime("%d/%m/%Y"))
    elif isinstance(data, str) and data:
        try:
            partes.append(date.fromisoformat(data).strftime("%d/%m/%Y"))
        except ValueError:
            partes.append(data)
    carga = item.get("carga_horaria")
    if isinstance(carga, int) and carga > 0:
        partes.append(f"{carga}h")
    responsaveis = formatar_responsaveis(item.get("responsaveis"))
    if responsaveis:
        partes.append(responsaveis)
    return " — ".join(parte for parte in partes if parte)


def linhas_de_snapshot(itens: list[dict] | None) -> list[str]:
    if not itens:
        return []
    return [formatar_linha_atividade(item) for item in itens]


def canonico_atividades(itens: list[dict] | None) -> str:
    if not itens:
        return ""
    return json.dumps(itens, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def elegivel_para_certificado(
    *,
    status: InscricaoAtividadeStatus | str,
    certificado_habilitado: bool,
    atividade_status: AtividadeStatus | str,
    exige_presenca: bool,
) -> bool:
    if not certificado_habilitado:
        return False
    if _valor(atividade_status) == AtividadeStatus.CANCELADA.value:
        return False
    participacao = _valor(status)
    if participacao == InscricaoAtividadeStatus.CANCELADA.value:
        return False
    if exige_presenca:
        return participacao == InscricaoAtividadeStatus.PRESENTE.value
    return participacao in STATUS_ELEGIVEIS_SEM_PRESENCA


def _hora(value: time | None) -> str | None:
    if value is None:
        return None
    return value.strftime("%H:%M")


def snapshot_de_atividade(
    *,
    titulo: str,
    tipo: AtividadeTipo | str,
    tipo_personalizado: str | None,
    data: date,
    hora_inicio: time | None,
    hora_fim: time | None,
    carga_horaria: int | None,
    local: str | None,
    responsaveis: list[dict],
    status: InscricaoAtividadeStatus | str,
) -> dict[str, object]:
    return {
        "titulo": titulo,
        "tipo": _valor(tipo),
        "tipo_personalizado": tipo_personalizado,
        "data": data.isoformat(),
        "hora_inicio": _hora(hora_inicio),
        "hora_fim": _hora(hora_fim),
        "carga_horaria": carga_horaria,
        "local": local,
        "responsaveis": responsaveis,
        "status": _valor(status),
    }
