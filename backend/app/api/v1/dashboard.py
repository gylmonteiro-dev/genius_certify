from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import RequireInstituicaoAdmin
from app.models.usuario import Usuario
from app.schemas.dashboard import DashboardResumoResponse
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/resumo", response_model=DashboardResumoResponse)
async def get_dashboard_resumo(
    instituicao_id: UUID | None = Query(default=None),
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> DashboardResumoResponse:
    return await DashboardService(session).resumo(
        actor=current_user,
        instituicao_id=instituicao_id,
    )
