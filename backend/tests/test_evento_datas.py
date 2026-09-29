from datetime import date, timedelta

import pytest
from pydantic import ValidationError

from app.core.exceptions import AppError
from app.schemas.curso import CursoCreate, CursoUpdate
from app.services.evento_datas import (
    MAX_DATAS_EVENTO,
    datas_consecutivas,
    formatar_datas_evento,
    normalizar_datas_evento,
    resolver_datas_escrita,
)


def test_evento_sem_data() -> None:
    assert normalizar_datas_evento(None) == []
    assert normalizar_datas_evento([]) == []
    assert formatar_datas_evento([]) == ""


def test_evento_de_um_dia() -> None:
    dia = date(2026, 5, 20)
    assert normalizar_datas_evento([dia]) == [dia]
    assert formatar_datas_evento([dia]) == "O evento foi realizado em 20/05/2026."


def test_intervalo_continuo() -> None:
    inicio = date(2026, 5, 20)
    datas = [inicio + timedelta(days=offset) for offset in range(6)]
    assert datas_consecutivas(datas) is True
    assert (
        formatar_datas_evento(datas)
        == "O evento foi realizado de 20/05/2026 a 25/05/2026."
    )


def test_datas_especificas() -> None:
    datas = [
        date(2026, 5, 20),
        date(2026, 5, 22),
        date(2026, 5, 23),
        date(2026, 5, 25),
    ]
    assert datas_consecutivas(datas) is False
    assert (
        formatar_datas_evento(datas)
        == "O evento foi realizado nos dias 20/05/2026, 22/05/2026, 23/05/2026 e 25/05/2026."
    )


def test_datas_fora_de_ordem_sao_ordenadas() -> None:
    datas = [date(2026, 5, 25), date(2026, 5, 20), date(2026, 5, 22)]
    assert normalizar_datas_evento(datas) == [
        date(2026, 5, 20),
        date(2026, 5, 22),
        date(2026, 5, 25),
    ]


def test_duplicidade_rejeitada() -> None:
    dia = date(2026, 5, 20)
    with pytest.raises(AppError) as exc:
        normalizar_datas_evento([dia, dia])
    assert exc.value.status_code == 422


def test_limite_maximo() -> None:
    inicio = date(2026, 1, 1)
    demais = [inicio + timedelta(days=offset) for offset in range(MAX_DATAS_EVENTO + 1)]
    with pytest.raises(AppError) as exc:
        normalizar_datas_evento(demais)
    assert exc.value.status_code == 422
    assert len(normalizar_datas_evento(demais[:MAX_DATAS_EVENTO])) == MAX_DATAS_EVENTO


def test_alias_legado_quando_so_data_evento() -> None:
    dia = date(2026, 5, 20)
    assert (
        resolver_datas_escrita(
            datas_evento=None,
            datas_informadas=False,
            data_evento=dia,
            data_informada=True,
        )
        == [dia]
    )


def test_datas_evento_prevalece_sobre_alias() -> None:
    assert resolver_datas_escrita(
        datas_evento=[date(2026, 5, 22), date(2026, 5, 20)],
        datas_informadas=True,
        data_evento=date(2026, 1, 1),
        data_informada=True,
    ) == [date(2026, 5, 20), date(2026, 5, 22)]


def test_schema_rejeita_duplicata_e_ordena() -> None:
    with pytest.raises(ValidationError):
        CursoCreate(
            titulo="Evento",
            datas_evento=[date(2026, 5, 20), date(2026, 5, 20)],
        )
    curso = CursoUpdate(
        datas_evento=[date(2026, 5, 25), date(2026, 5, 20)],
    )
    assert curso.datas_evento == [date(2026, 5, 20), date(2026, 5, 25)]
