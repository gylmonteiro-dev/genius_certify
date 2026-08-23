from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.inscricao import Inscricao
from app.models.participante import Participante


class InscricaoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_participante_curso(
        self,
        *,
        instituicao_id: UUID,
        participante_id: UUID,
        curso_id: UUID,
    ) -> Inscricao | None:
        stmt = select(Inscricao).where(
            Inscricao.instituicao_id == instituicao_id,
            Inscricao.participante_id == participante_id,
            Inscricao.curso_id == curso_id,
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_curso(
        self,
        *,
        instituicao_id: UUID,
        curso_id: UUID,
    ) -> list[Inscricao]:
        stmt = (
            select(Inscricao)
            .where(
                Inscricao.instituicao_id == instituicao_id,
                Inscricao.curso_id == curso_id,
            )
            .options(selectinload(Inscricao.participante))
            .order_by(Inscricao.created_at.asc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().unique().all())

    async def list_by_participante(
        self,
        *,
        instituicao_id: UUID,
        participante_id: UUID,
    ) -> list[Inscricao]:
        stmt = (
            select(Inscricao)
            .where(
                Inscricao.instituicao_id == instituicao_id,
                Inscricao.participante_id == participante_id,
            )
            .options(selectinload(Inscricao.curso))
            .order_by(Inscricao.created_at.asc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().unique().all())

    async def list_participantes_by_curso(
        self,
        *,
        instituicao_id: UUID,
        curso_id: UUID,
    ) -> list[Participante]:
        stmt = (
            select(Participante)
            .join(Inscricao, Inscricao.participante_id == Participante.id)
            .where(
                Inscricao.instituicao_id == instituicao_id,
                Inscricao.curso_id == curso_id,
            )
            .order_by(Participante.nome.asc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().unique().all())

    async def create(self, **fields: object) -> Inscricao:
        inscricao = Inscricao(**fields)
        self._session.add(inscricao)
        await self._session.flush()
        await self._session.refresh(inscricao)
        return inscricao
