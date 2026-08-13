from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import RequireInstituicaoAdmin
from app.models.usuario import Usuario
from app.schemas.curso import CursoCreate, CursoResponse, CursoUpdate
from app.services.curso_service import CursoService

router = APIRouter(prefix="/cursos", tags=["cursos"])


@router.post(
    "",
    response_model=CursoResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_curso(
    body: CursoCreate,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> CursoResponse:
    return await CursoService(session).create(body, actor=current_user)


@router.get("", response_model=list[CursoResponse])
async def list_cursos(
    instituicao_id: UUID | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> list[CursoResponse]:
    return await CursoService(session).list(
        actor=current_user,
        instituicao_id=instituicao_id,
        skip=skip,
        limit=limit,
    )


@router.get("/{curso_id}", response_model=CursoResponse)
async def get_curso(
    curso_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> CursoResponse:
    return await CursoService(session).get(curso_id, actor=current_user)


@router.patch("/{curso_id}", response_model=CursoResponse)
async def update_curso(
    curso_id: UUID,
    body: CursoUpdate,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> CursoResponse:
    return await CursoService(session).update(curso_id, body, actor=current_user)


@router.delete("/{curso_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_curso(
    curso_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> Response:
    await CursoService(session).delete(curso_id, actor=current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
