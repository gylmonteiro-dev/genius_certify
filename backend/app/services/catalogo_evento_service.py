from __future__ import annotations

import re
import unicodedata
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError, ConflictError, NotFoundError
from app.models.catalogo_evento import CatalogoEventoItem, CatalogoEventoKind
from app.models.usuario import Usuario, UsuarioRole
from app.repositories.catalogo_evento_repository import CatalogoEventoRepository
from app.schemas.catalogo_evento import (
    CatalogoEventoItemCreate,
    CatalogoEventoItemResponse,
    CatalogoEventoItemUpdate,
)


def slugify_catalogo(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value.strip())
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "_", ascii_text.lower()).strip("_")
    return slug[:64]


class CatalogoEventoService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._items = CatalogoEventoRepository(session)

    async def list(
        self,
        *,
        actor: Usuario,
        kind: CatalogoEventoKind | None = None,
    ) -> list[CatalogoEventoItemResponse]:
        only_active = actor.role != UsuarioRole.SUPER_ADMIN
        items = await self._items.list(kind=kind, only_active=only_active)
        return [CatalogoEventoItemResponse.model_validate(item) for item in items]

    async def list_publico(
        self,
        *,
        kind: CatalogoEventoKind | None = None,
    ) -> list[CatalogoEventoItemResponse]:
        items = await self._items.list(kind=kind, only_active=True)
        return [CatalogoEventoItemResponse.model_validate(item) for item in items]

    async def create(
        self,
        data: CatalogoEventoItemCreate,
    ) -> CatalogoEventoItemResponse:
        nome = data.nome.strip()
        slug = slugify_catalogo(data.slug or nome)
        if not slug:
            raise AppError("Não foi possível gerar um slug válido")

        existing = await self._items.get_by_kind_slug(data.kind, slug)
        if existing is not None:
            raise ConflictError("Já existe um item com este identificador neste tipo")

        ordem = data.ordem
        if ordem is None:
            ordem = await self._items.max_ordem(data.kind) + 10

        item = await self._items.create(
            kind=data.kind,
            slug=slug,
            nome=nome,
            nome_en=(data.nome_en or "").strip(),
            ativo=data.ativo,
            ordem=ordem,
        )
        await self._session.commit()
        await self._session.refresh(item)
        return CatalogoEventoItemResponse.model_validate(item)

    async def update(
        self,
        item_id: UUID,
        data: CatalogoEventoItemUpdate,
    ) -> CatalogoEventoItemResponse:
        item = await self._get_or_404(item_id)
        payload = data.model_dump(exclude_unset=True)
        if "nome" in payload and payload["nome"] is not None:
            payload["nome"] = payload["nome"].strip()
        if "nome_en" in payload and payload["nome_en"] is not None:
            payload["nome_en"] = payload["nome_en"].strip()
        for field, value in payload.items():
            setattr(item, field, value)
        await self._items.save(item)
        await self._session.commit()
        await self._session.refresh(item)
        return CatalogoEventoItemResponse.model_validate(item)

    async def deactivate(self, item_id: UUID) -> CatalogoEventoItemResponse:
        item = await self._get_or_404(item_id)
        item.ativo = False
        await self._items.save(item)
        await self._session.commit()
        await self._session.refresh(item)
        return CatalogoEventoItemResponse.model_validate(item)

    async def _get_or_404(self, item_id: UUID) -> CatalogoEventoItem:
        item = await self._items.get_by_id(item_id)
        if item is None:
            raise NotFoundError("Item de catálogo não encontrado")
        return item
