from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import RequireInstituicaoAdmin
from app.core.exceptions import AppError
from app.models.usuario import Usuario
from app.schemas.aluno import AlunoCreate, AlunoImportResponse, AlunoResponse, AlunoUpdate
from app.services.aluno_service import AlunoService

router = APIRouter(prefix="/alunos", tags=["alunos"])


@router.post(
    "",
    response_model=AlunoResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_aluno(
    body: AlunoCreate,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> AlunoResponse:
    return await AlunoService(session).create(body, actor=current_user)


@router.post("/importar", response_model=AlunoImportResponse)
async def importar_alunos(
    file: UploadFile = File(...),
    instituicao_id: UUID | None = Form(default=None),
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> AlunoImportResponse:
    filename = (file.filename or "").lower()
    if filename and not filename.endswith(".csv"):
        raise AppError("Envie um arquivo .csv")
    file_bytes = await file.read()
    return await AlunoService(session).import_csv(
        actor=current_user,
        file_bytes=file_bytes,
        instituicao_id=instituicao_id,
    )


@router.get("", response_model=list[AlunoResponse])
async def list_alunos(
    instituicao_id: UUID | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> list[AlunoResponse]:
    return await AlunoService(session).list(
        actor=current_user,
        instituicao_id=instituicao_id,
        skip=skip,
        limit=limit,
    )


@router.get("/{aluno_id}", response_model=AlunoResponse)
async def get_aluno(
    aluno_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> AlunoResponse:
    return await AlunoService(session).get(aluno_id, actor=current_user)


@router.patch("/{aluno_id}", response_model=AlunoResponse)
async def update_aluno(
    aluno_id: UUID,
    body: AlunoUpdate,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> AlunoResponse:
    return await AlunoService(session).update(aluno_id, body, actor=current_user)


@router.delete("/{aluno_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_aluno(
    aluno_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> Response:
    await AlunoService(session).delete(aluno_id, actor=current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
