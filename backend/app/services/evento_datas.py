"""Normalização e formatação das datas de um evento.

A coleção ordenada é a fonte da frase exibida no certificado. Os templates
recebem o texto pronto e não repetem estas regras.
"""

from __future__ import annotations

from datetime import date, timedelta

from fastapi import status
from sqlalchemy import inspect as sa_inspect
from sqlalchemy.orm import InstanceState

from app.core.exceptions import AppError

MAX_DATAS_EVENTO = 366


def normalizar_datas_evento(datas: list[date] | None) -> list[date]:
    """Ordena as datas e rejeita duplicidade ou excesso de 366 itens."""
    if not datas:
        return []
    if len(datas) > MAX_DATAS_EVENTO:
        raise AppError(
            "O evento aceita no máximo 366 datas",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    if len(set(datas)) != len(datas):
        raise AppError(
            "Datas do evento não podem se repetir",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    return sorted(datas)


def resolver_datas_escrita(
    *,
    datas_evento: list[date] | None,
    datas_informadas: bool,
    data_evento: date | None,
    data_informada: bool,
) -> list[date] | None:
    """Resolve a coleção a persistir.

    ``None`` significa que a edição não alterou as datas. Quando os dois
    campos vêm no payload, ``datas_evento`` prevalece. ``data_evento`` sozinho
    continua aceito como alias de uma única data.
    """
    if datas_informadas:
        return normalizar_datas_evento(datas_evento)
    if data_informada:
        if data_evento is None:
            return []
        return normalizar_datas_evento([data_evento])
    return None


def datas_do_curso(curso: object) -> list[date]:
    """Lê a coleção já carregada. Sem o relacionamento, usa o alias."""
    state: InstanceState[object] = sa_inspect(curso)
    if "datas" in state.unloaded:
        legado = getattr(curso, "data_evento", None)
        return [] if legado is None else [legado]
    return sorted(item.data for item in state.dict.get("datas", []))


def datas_consecutivas(datas: list[date]) -> bool:
    if len(datas) < 2:
        return False
    ordenadas = sorted(datas)
    return all(
        ordenadas[index] - ordenadas[index - 1] == timedelta(days=1)
        for index in range(1, len(ordenadas))
    )


def _formatar_br(value: date) -> str:
    return value.strftime("%d/%m/%Y")


def formatar_datas_evento(datas: list[date] | None) -> str:
    """Frase em português para o corpo do certificado e a prévia."""
    if not datas:
        return ""
    ordenadas = sorted(set(datas))
    formatadas = [_formatar_br(item) for item in ordenadas]
    if len(ordenadas) == 1:
        return f"O evento foi realizado em {formatadas[0]}."
    if datas_consecutivas(ordenadas):
        return f"O evento foi realizado de {formatadas[0]} a {formatadas[-1]}."
    if len(formatadas) == 2:
        return f"O evento foi realizado nos dias {formatadas[0]} e {formatadas[1]}."
    anteriores = ", ".join(formatadas[:-1])
    return f"O evento foi realizado nos dias {anteriores} e {formatadas[-1]}."
