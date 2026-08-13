from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import RequireInstituicaoAdmin, RequireSuperAdmin
from app.models.usuario import Usuario
from app.schemas.instituicao import (
    InstituicaoCreate,
    InstituicaoResponse,
    InstituicaoUpdate,
)
from app.services.instituicao_service import InstituicaoService

router = APIRouter(prefix="/instituicoes", tags=["instituicoes"])


@router.post(
    "",
    response_model=InstituicaoResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_instituicao(
    body: InstituicaoCreate,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireSuperAdmin),
) -> InstituicaoResponse:
    return await InstituicaoService(session).create(body, actor=current_user)


@router.get("", response_model=list[InstituicaoResponse])
async def list_instituicoes(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> list[InstituicaoResponse]:
    return await InstituicaoService(session).list(
        actor=current_user,
        skip=skip,
        limit=limit,
    )


@router.get("/{instituicao_id}", response_model=InstituicaoResponse)
async def get_instituicao(
    instituicao_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> InstituicaoResponse:
    return await InstituicaoService(session).get(instituicao_id, actor=current_user)


@router.patch("/{instituicao_id}", response_model=InstituicaoResponse)
async def update_instituicao(
    instituicao_id: UUID,
    body: InstituicaoUpdate,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> InstituicaoResponse:
    return await InstituicaoService(session).update(
        instituicao_id,
        body,
        actor=current_user,
    )


@router.post(
    "/{instituicao_id}/assets/{asset_type}",
    response_model=InstituicaoResponse,
)
async def upload_instituicao_asset(
    instituicao_id: UUID,
    asset_type: str,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> InstituicaoResponse:
    """Upload de logo ou assinatura para MinIO/S3. Salva apenas a URL no banco."""
    return await InstituicaoService(session).upload_asset(
        instituicao_id,
        actor=current_user,
        asset_type=asset_type,
        file=file,
    )


@router.delete("/{instituicao_id}", response_model=InstituicaoResponse)
async def delete_instituicao(
    instituicao_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireSuperAdmin),
) -> InstituicaoResponse:
    """Soft delete: status = suspended."""
    return await InstituicaoService(session).delete(instituicao_id, actor=current_user)
