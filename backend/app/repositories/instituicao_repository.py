from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.instituicao import Instituicao, InstituicaoStatus


class InstituicaoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, instituicao_id: UUID) -> Instituicao | None:
        result = await self._session.execute(
            select(Instituicao).where(Instituicao.id == instituicao_id)
        )
        return result.scalar_one_or_none()

    async def get_by_codigo(self, codigo: str) -> Instituicao | None:
        result = await self._session.execute(
            select(Instituicao).where(Instituicao.codigo == codigo.upper())
        )
        return result.scalar_one_or_none()

    async def get_by_cnpj(self, cnpj: str) -> Instituicao | None:
        result = await self._session.execute(
            select(Instituicao).where(Instituicao.cnpj == cnpj)
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        *,
        instituicao_id: UUID | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Instituicao]:
        stmt = select(Instituicao).order_by(Instituicao.nome.asc())
        if instituicao_id is not None:
            stmt = stmt.where(Instituicao.id == instituicao_id)
        stmt = stmt.offset(skip).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, **fields: object) -> Instituicao:
        instituicao = Instituicao(**fields)
        self._session.add(instituicao)
        await self._session.flush()
        await self._session.refresh(instituicao)
        return instituicao

    async def save(self, instituicao: Instituicao) -> Instituicao:
        await self._session.flush()
        await self._session.refresh(instituicao)
        return instituicao

    async def exists_codigo_or_cnpj(
        self,
        *,
        codigo: str,
        cnpj: str,
        exclude_id: UUID | None = None,
    ) -> Instituicao | None:
        stmt = select(Instituicao).where(
            or_(Instituicao.codigo == codigo.upper(), Instituicao.cnpj == cnpj)
        )
        if exclude_id is not None:
            stmt = stmt.where(Instituicao.id != exclude_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def soft_delete(self, instituicao: Instituicao) -> Instituicao:
        instituicao.status = InstituicaoStatus.SUSPENDED
        return await self.save(instituicao)
