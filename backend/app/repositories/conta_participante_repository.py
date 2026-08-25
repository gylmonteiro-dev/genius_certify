from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conta_participante import ContaParticipante


class ContaParticipanteRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, conta_id: UUID) -> ContaParticipante | None:
        stmt = select(ContaParticipante).where(ContaParticipante.id == conta_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_documento(self, documento: str) -> ContaParticipante | None:
        stmt = select(ContaParticipante).where(ContaParticipante.documento == documento)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> ContaParticipante | None:
        stmt = select(ContaParticipante).where(ContaParticipante.email == email.lower())
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(
        self,
        *,
        nome: str,
        email: str,
        documento: str,
        hashed_password: str,
        is_active: bool = True,
    ) -> ContaParticipante:
        conta = ContaParticipante(
            nome=nome,
            email=email.lower(),
            documento=documento,
            hashed_password=hashed_password,
            is_active=is_active,
        )
        self._session.add(conta)
        await self._session.flush()
        await self._session.refresh(conta)
        return conta

    async def save(self, conta: ContaParticipante) -> ContaParticipante:
        await self._session.flush()
        await self._session.refresh(conta)
        return conta
