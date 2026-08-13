from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.aluno import Aluno
from app.models.certificado import Certificado


class AlunoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(
        self,
        aluno_id: UUID,
        *,
        instituicao_id: UUID | None = None,
    ) -> Aluno | None:
        stmt = select(Aluno).where(Aluno.id == aluno_id)
        if instituicao_id is not None:
            stmt = stmt.where(Aluno.instituicao_id == instituicao_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list(
        self,
        *,
        instituicao_id: UUID | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Aluno]:
        stmt = select(Aluno).order_by(Aluno.nome.asc())
        if instituicao_id is not None:
            stmt = stmt.where(Aluno.instituicao_id == instituicao_id)
        stmt = stmt.offset(skip).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def find_conflict(
        self,
        *,
        instituicao_id: UUID,
        email: str,
        documento: str,
        exclude_id: UUID | None = None,
    ) -> Aluno | None:
        stmt = select(Aluno).where(
            Aluno.instituicao_id == instituicao_id,
            or_(Aluno.email == email.lower(), Aluno.documento == documento),
        )
        if exclude_id is not None:
            stmt = stmt.where(Aluno.id != exclude_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, **fields: object) -> Aluno:
        aluno = Aluno(**fields)
        self._session.add(aluno)
        await self._session.flush()
        await self._session.refresh(aluno)
        return aluno

    async def save(self, aluno: Aluno) -> Aluno:
        await self._session.flush()
        await self._session.refresh(aluno)
        return aluno

    async def delete(self, aluno: Aluno) -> None:
        await self._session.delete(aluno)
        await self._session.flush()

    async def count_certificados(self, aluno_id: UUID) -> int:
        stmt = select(func.count()).select_from(Certificado).where(
            Certificado.aluno_id == aluno_id
        )
        result = await self._session.execute(stmt)
        return int(result.scalar_one())
