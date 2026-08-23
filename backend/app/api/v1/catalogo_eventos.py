from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import RequireInstituicaoAdmin, RequireSuperAdmin
from app.models.catalogo_evento import CatalogoEventoKind
from app.models.usuario import Usuario
from app.schemas.catalogo_evento import (
    CatalogoEventoItemCreate,
    CatalogoEventoItemResponse,
    CatalogoEventoItemUpdate,
)
from app.services.catalogo_evento_service import CatalogoEventoService

router = APIRouter(prefix="/catalogo-eventos", tags=["catalogo-eventos"])


@router.get("", response_model=list[CatalogoEventoItemResponse])
async def list_catalogo_eventos(
    kind: CatalogoEventoKind | None = Query(default=None),
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> list[CatalogoEventoItemResponse]:
    return await CatalogoEventoService(session).list(actor=current_user, kind=kind)


@router.post(
    "",
    response_model=CatalogoEventoItemResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_catalogo_evento(
    body: CatalogoEventoItemCreate,
    session: AsyncSession = Depends(get_db),
    _current_user: Usuario = Depends(RequireSuperAdmin),
) -> CatalogoEventoItemResponse:
    return await CatalogoEventoService(session).create(body)


@router.patch("/{item_id}", response_model=CatalogoEventoItemResponse)
async def update_catalogo_evento(
    item_id: UUID,
    body: CatalogoEventoItemUpdate,
    session: AsyncSession = Depends(get_db),
    _current_user: Usuario = Depends(RequireSuperAdmin),
) -> CatalogoEventoItemResponse:
    return await CatalogoEventoService(session).update(item_id, body)


@router.delete("/{item_id}", response_model=CatalogoEventoItemResponse)
async def deactivate_catalogo_evento(
    item_id: UUID,
    session: AsyncSession = Depends(get_db),
    _current_user: Usuario = Depends(RequireSuperAdmin),
) -> CatalogoEventoItemResponse:
    return await CatalogoEventoService(session).deactivate(item_id)
