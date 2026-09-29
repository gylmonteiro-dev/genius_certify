"""Publicação da capa no armazenamento e no evento.

A imagem nova só substitui a anterior depois do commit. Se o envio ou a
transação falhar, as URLs anteriores permanecem.
"""

from __future__ import annotations

import logging
from typing import Protocol
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.models.curso import Curso
from app.services.capa_imagem import CapaProcessada, processar_capa
from app.services.storage_service import CAPA_CACHE_CONTROL, StorageService

logger = logging.getLogger(__name__)


class CapaStorage(Protocol):
    def upload_bytes(
        self,
        *,
        data: bytes,
        key: str,
        content_type: str,
        cache_control: str | None = None,
    ) -> str: ...

    def delete_keys(self, keys: list[str]) -> None: ...

    def key_from_url(self, url: str | None) -> str | None: ...

    def build_evento_capa_key(
        self,
        instituicao_id: UUID,
        evento_id: UUID,
        kind: str,
        version: str,
    ) -> str: ...


def chaves_capa_do_evento(
    storage: CapaStorage,
    urls: tuple[str | None, ...],
    *,
    instituicao_id: UUID,
    evento_id: UUID,
) -> list[str]:
    keys: list[str] = []
    for url in urls:
        key = storage.key_from_url(url)
        if key and StorageService.is_evento_capa_key(key, instituicao_id, evento_id):
            keys.append(key)
    return keys


async def publicar_capa(
    curso: Curso,
    *,
    data: bytes,
    filename: str | None,
    content_type: str | None,
    foco_x: float | None,
    foco_y: float | None,
    storage: CapaStorage,
    session: AsyncSession,
) -> CapaProcessada:
    processed = processar_capa(
        data,
        filename=filename,
        content_type=content_type,
        foco_x=foco_x,
        foco_y=foco_y,
    )
    version = uuid4().hex[:12]
    card_key = storage.build_evento_capa_key(
        curso.instituicao_id, curso.id, "card", version
    )
    detail_key = storage.build_evento_capa_key(
        curso.instituicao_id, curso.id, "detail", version
    )
    uploaded: list[str] = []
    try:
        card_url = storage.upload_bytes(
            data=processed.card,
            key=card_key,
            content_type="image/webp",
            cache_control=CAPA_CACHE_CONTROL,
        )
        uploaded.append(card_key)
        detail_url = storage.upload_bytes(
            data=processed.detail,
            key=detail_key,
            content_type="image/webp",
            cache_control=CAPA_CACHE_CONTROL,
        )
        uploaded.append(detail_key)
    except Exception as exc:
        storage.delete_keys(uploaded)
        raise AppError("Não foi possível armazenar a capa do evento") from exc

    previous = (curso.capa_card_url, curso.capa_detail_url)
    previous_focus = (curso.capa_foco_x, curso.capa_foco_y)
    curso.capa_card_url = card_url
    curso.capa_detail_url = detail_url
    curso.capa_foco_x = processed.foco_x
    curso.capa_foco_y = processed.foco_y
    try:
        await session.commit()
    except Exception:
        curso.capa_card_url, curso.capa_detail_url = previous
        curso.capa_foco_x, curso.capa_foco_y = previous_focus
        await session.rollback()
        storage.delete_keys(uploaded)
        raise

    _descartar_versoes(storage, previous, curso)
    return processed


async def remover_capa(
    curso: Curso,
    *,
    storage: CapaStorage,
    session: AsyncSession,
) -> None:
    previous = (curso.capa_card_url, curso.capa_detail_url)
    previous_focus = (curso.capa_foco_x, curso.capa_foco_y)
    curso.capa_card_url = None
    curso.capa_detail_url = None
    curso.capa_foco_x = None
    curso.capa_foco_y = None
    try:
        await session.commit()
    except Exception:
        curso.capa_card_url, curso.capa_detail_url = previous
        curso.capa_foco_x, curso.capa_foco_y = previous_focus
        await session.rollback()
        raise
    _descartar_versoes(storage, previous, curso)


def _descartar_versoes(
    storage: CapaStorage,
    urls: tuple[str | None, str | None],
    curso: Curso,
) -> None:
    keys = chaves_capa_do_evento(
        storage,
        urls,
        instituicao_id=curso.instituicao_id,
        evento_id=curso.id,
    )
    if not keys:
        return
    try:
        storage.delete_keys(keys)
    except Exception:
        logger.warning(
            "Capa do evento %s atualizada, mas a limpeza das versões antigas falhou",
            curso.id,
        )
