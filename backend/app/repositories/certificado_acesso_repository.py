from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.certificado_acesso import CertificadoAcesso, CertificadoAcessoTipo


class CertificadoAcessoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def registrar(
        self,
        *,
        certificado_id: UUID,
        instituicao_id: UUID,
        tipo: CertificadoAcessoTipo,
    ) -> CertificadoAcesso:
        acesso = CertificadoAcesso(
            certificado_id=certificado_id,
            instituicao_id=instituicao_id,
            tipo=tipo,
        )
        self._session.add(acesso)
        await self._session.flush()
        return acesso

    async def count_total(self, *, instituicao_id: UUID | None = None) -> int:
        stmt = select(func.count(CertificadoAcesso.id))
        if instituicao_id is not None:
            stmt = stmt.where(CertificadoAcesso.instituicao_id == instituicao_id)
        result = await self._session.execute(stmt)
        return int(result.scalar_one())
