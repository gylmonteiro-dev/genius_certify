from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.certificado import Certificado, CertificadoStatus


class CertificadoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(
        self,
        certificado_id: UUID,
        *,
        instituicao_id: UUID | None = None,
    ) -> Certificado | None:
        stmt = select(Certificado).where(Certificado.id == certificado_id)
        if instituicao_id is not None:
            stmt = stmt.where(Certificado.instituicao_id == instituicao_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_codigo_validacao(self, codigo: UUID) -> Certificado | None:
        result = await self._session.execute(
            select(Certificado).where(Certificado.codigo_validacao == codigo)
        )
        return result.scalar_one_or_none()

    async def get_active_by_aluno_curso(
        self,
        *,
        instituicao_id: UUID,
        aluno_id: UUID,
        curso_id: UUID,
    ) -> Certificado | None:
        stmt = select(Certificado).where(
            Certificado.instituicao_id == instituicao_id,
            Certificado.aluno_id == aluno_id,
            Certificado.curso_id == curso_id,
            Certificado.status == CertificadoStatus.ACTIVE,
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list(
        self,
        *,
        instituicao_id: UUID | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Certificado]:
        stmt = select(Certificado).order_by(Certificado.created_at.desc())
        if instituicao_id is not None:
            stmt = stmt.where(Certificado.instituicao_id == instituicao_id)
        stmt = stmt.offset(skip).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, **fields: object) -> Certificado:
        certificado = Certificado(**fields)
        self._session.add(certificado)
        await self._session.flush()
        await self._session.refresh(certificado)
        return certificado

    async def save(self, certificado: Certificado) -> Certificado:
        await self._session.flush()
        await self._session.refresh(certificado)
        return certificado
