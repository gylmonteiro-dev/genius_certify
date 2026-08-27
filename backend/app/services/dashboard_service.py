from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError
from app.models.usuario import Usuario, UsuarioRole
from app.repositories.certificado_repository import CertificadoRepository
from app.repositories.curso_repository import CursoRepository
from app.schemas.dashboard import DashboardResumoResponse


class DashboardService:
    def __init__(self, session: AsyncSession) -> None:
        self._cursos = CursoRepository(session)
        self._certificados = CertificadoRepository(session)

    def _tenant_id_for_queries(
        self,
        actor: Usuario,
        instituicao_id: UUID | None,
    ) -> UUID | None:
        if actor.role == UsuarioRole.SUPER_ADMIN:
            return instituicao_id
        if actor.instituicao_id is None:
            raise ForbiddenError("Usuário sem instituição vinculada")
        if instituicao_id is not None and instituicao_id != actor.instituicao_id:
            raise ForbiddenError("Não é permitido consultar outro tenant")
        return actor.instituicao_id

    async def resumo(
        self,
        *,
        actor: Usuario,
        instituicao_id: UUID | None = None,
    ) -> DashboardResumoResponse:
        tenant = self._tenant_id_for_queries(actor, instituicao_id)
        eventos = await self._cursos.count_by_status(instituicao_id=tenant)
        certificados = await self._certificados.count_by_status(instituicao_id=tenant)

        abertos = eventos.get("upcoming", 0)
        cancelados = eventos.get("cancelled", 0)
        rascunho = eventos.get("draft", 0)
        concluidos = eventos.get("completed", 0)
        validados = certificados.get("active", 0)
        revogados = certificados.get("revoked", 0)
        expirados = certificados.get("expired", 0)

        return DashboardResumoResponse(
            eventos_total=abertos + cancelados + rascunho + concluidos,
            eventos_abertos=abertos,
            eventos_cancelados=cancelados,
            eventos_rascunho=rascunho,
            eventos_concluidos=concluidos,
            certificados_emitidos=validados + revogados + expirados,
            certificados_validados=validados,
            certificados_revogados=revogados,
            certificados_expirados=expirados,
        )
