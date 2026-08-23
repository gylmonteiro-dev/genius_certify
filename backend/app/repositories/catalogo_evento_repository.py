from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalogo_evento import CatalogoEventoItem, CatalogoEventoKind


class CatalogoEventoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, item_id: UUID) -> CatalogoEventoItem | None:
        result = await self._session.execute(
            select(CatalogoEventoItem).where(CatalogoEventoItem.id == item_id)
        )
        return result.scalar_one_or_none()

    async def get_by_kind_slug(
        self,
        kind: CatalogoEventoKind,
        slug: str,
    ) -> CatalogoEventoItem | None:
        result = await self._session.execute(
            select(CatalogoEventoItem).where(
                CatalogoEventoItem.kind == kind,
                CatalogoEventoItem.slug == slug,
            )
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        *,
        kind: CatalogoEventoKind | None = None,
        only_active: bool = False,
    ) -> list[CatalogoEventoItem]:
        stmt = select(CatalogoEventoItem).order_by(
            CatalogoEventoItem.kind.asc(),
            CatalogoEventoItem.ordem.asc(),
            CatalogoEventoItem.nome.asc(),
        )
        if kind is not None:
            stmt = stmt.where(CatalogoEventoItem.kind == kind)
        if only_active:
            stmt = stmt.where(CatalogoEventoItem.ativo.is_(True))
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def max_ordem(self, kind: CatalogoEventoKind) -> int:
        stmt = select(func.coalesce(func.max(CatalogoEventoItem.ordem), 0)).where(
            CatalogoEventoItem.kind == kind
        )
        result = await self._session.execute(stmt)
        return int(result.scalar_one())

    async def create(self, **fields: object) -> CatalogoEventoItem:
        item = CatalogoEventoItem(**fields)
        self._session.add(item)
        await self._session.flush()
        await self._session.refresh(item)
        return item

    async def save(self, item: CatalogoEventoItem) -> CatalogoEventoItem:
        await self._session.flush()
        await self._session.refresh(item)
        return item
