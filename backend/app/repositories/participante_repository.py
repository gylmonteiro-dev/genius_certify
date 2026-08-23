from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.certificado import Certificado
from app.models.participante import Participante


class ParticipanteRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(
        self,
        participante_id: UUID,
        *,
        instituicao_id: UUID | None = None,
    ) -> Participante | None:
        stmt = select(Participante).where(Participante.id == participante_id)
        if instituicao_id is not None:
            stmt = stmt.where(Participante.instituicao_id == instituicao_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list(
        self,
        *,
        instituicao_id: UUID | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Participante]:
        stmt = select(Participante).order_by(Participante.nome.asc())
        if instituicao_id is not None:
            stmt = stmt.where(Participante.instituicao_id == instituicao_id)
        stmt = stmt.offset(skip).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_email(
        self,
        *,
        instituicao_id: UUID,
        email: str,
    ) -> Participante | None:
        stmt = select(Participante).where(
            Participante.instituicao_id == instituicao_id,
            Participante.email == email.lower(),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_documento(
        self,
        *,
        instituicao_id: UUID,
        documento: str,
    ) -> Participante | None:
        stmt = select(Participante).where(
            Participante.instituicao_id == instituicao_id,
            Participante.documento == documento,
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_documento(self, documento: str) -> list[Participante]:
        stmt = (
            select(Participante)
            .where(Participante.documento == documento)
            .order_by(Participante.created_at.asc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def find_conflict(
        self,
        *,
        instituicao_id: UUID,
        email: str,
        documento: str,
        exclude_id: UUID | None = None,
    ) -> Participante | None:
        stmt = select(Participante).where(
            Participante.instituicao_id == instituicao_id,
            or_(Participante.email == email.lower(), Participante.documento == documento),
        )
        if exclude_id is not None:
            stmt = stmt.where(Participante.id != exclude_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, **fields: object) -> Participante:
        participante = Participante(**fields)
        self._session.add(participante)
        await self._session.flush()
        await self._session.refresh(participante)
        return participante

    async def save(self, participante: Participante) -> Participante:
        await self._session.flush()
        await self._session.refresh(participante)
        return participante

    async def delete(self, participante: Participante) -> None:
        await self._session.delete(participante)
        await self._session.flush()

    async def count_certificados(self, participante_id: UUID) -> int:
        stmt = select(func.count()).select_from(Certificado).where(
            Certificado.participante_id == participante_id
        )
        result = await self._session.execute(stmt)
        return int(result.scalar_one())
