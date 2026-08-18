from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.aluno import AlunoResponse
from app.schemas.curso import CursoPublicResponse, InscricaoPublicaRequest
from app.services.publico_service import PublicoService

router = APIRouter(prefix="/publico", tags=["publico"])


@router.get("/cursos", response_model=list[CursoPublicResponse])
async def list_cursos_publicos(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
) -> list[CursoPublicResponse]:
    return await PublicoService(session).list_cursos(skip=skip, limit=limit)


@router.get("/cursos/{curso_id}", response_model=CursoPublicResponse)
async def get_curso_publico(
    curso_id: UUID,
    session: AsyncSession = Depends(get_db),
) -> CursoPublicResponse:
    return await PublicoService(session).get_curso(curso_id)


@router.post(
    "/cursos/{curso_id}/inscrever",
    response_model=AlunoResponse,
    status_code=status.HTTP_201_CREATED,
)
async def inscrever_curso_publico(
    curso_id: UUID,
    body: InscricaoPublicaRequest,
    session: AsyncSession = Depends(get_db),
) -> AlunoResponse:
    return await PublicoService(session).inscrever(curso_id, body)
