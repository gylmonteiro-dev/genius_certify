from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.certificado import Certificado
from app.models.curso import Curso, CursoStatus
from app.models.instituicao import Instituicao, InstituicaoStatus


class CursoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(
        self,
        curso_id: UUID,
        *,
        instituicao_id: UUID | None = None,
    ) -> Curso | None:
        stmt = select(Curso).where(Curso.id == curso_id)
        if instituicao_id is not None:
            stmt = stmt.where(Curso.instituicao_id == instituicao_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list(
        self,
        *,
        instituicao_id: UUID | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Curso]:
        stmt = select(Curso).order_by(Curso.titulo.asc())
        if instituicao_id is not None:
            stmt = stmt.where(Curso.instituicao_id == instituicao_id)
        stmt = stmt.offset(skip).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_publico(
        self,
        *,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Curso]:
        stmt = (
            select(Curso)
            .join(Instituicao)
            .where(
                Curso.status != CursoStatus.DRAFT,
                Instituicao.status == InstituicaoStatus.ACTIVE,
            )
            .options(selectinload(Curso.instituicao))
            .order_by(Curso.data_evento.asc().nulls_last(), Curso.titulo.asc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().unique().all())

    async def get_publico(self, curso_id: UUID) -> Curso | None:
        stmt = (
            select(Curso)
            .join(Instituicao)
            .where(
                Curso.id == curso_id,
                Curso.status != CursoStatus.DRAFT,
                Instituicao.status == InstituicaoStatus.ACTIVE,
            )
            .options(selectinload(Curso.instituicao))
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, **fields: object) -> Curso:
        curso = Curso(**fields)
        self._session.add(curso)
        await self._session.flush()
        await self._session.refresh(curso)
        return curso

    async def save(self, curso: Curso) -> Curso:
        await self._session.flush()
        await self._session.refresh(curso)
        return curso

    async def delete(self, curso: Curso) -> None:
        await self._session.delete(curso)
        await self._session.flush()

    async def count_certificados(self, curso_id: UUID) -> int:
        stmt = select(func.count()).select_from(Certificado).where(
            Certificado.curso_id == curso_id
        )
        result = await self._session.execute(stmt)
        return int(result.scalar_one())
