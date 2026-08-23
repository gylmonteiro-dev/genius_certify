from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import RequireInstituicaoAdmin
from app.core.exceptions import AppError
from app.models.participante import ParticipanteStatus
from app.models.usuario import Usuario
from app.schemas.participante import (
    ParticipanteCreate,
    ParticipanteDetalheResponse,
    ParticipanteImportResponse,
    ParticipanteResponse,
    ParticipanteUpdate,
)
from app.services.participante_service import ParticipanteService

router = APIRouter(prefix="/participantes", tags=["participantes"])


@router.post(
    "",
    response_model=ParticipanteResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_participante(
    body: ParticipanteCreate,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> ParticipanteResponse:
    return await ParticipanteService(session).create(body, actor=current_user)


@router.post("/importar", response_model=ParticipanteImportResponse)
async def importar_participantes(
    file: UploadFile = File(...),
    instituicao_id: UUID | None = Form(default=None),
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> ParticipanteImportResponse:
    filename = (file.filename or "").lower()
    if filename and not filename.endswith(".csv"):
        raise AppError("Envie um arquivo .csv")
    file_bytes = await file.read()
    return await ParticipanteService(session).import_csv(
        actor=current_user,
        file_bytes=file_bytes,
        instituicao_id=instituicao_id,
    )


@router.get("", response_model=list[ParticipanteResponse])
async def list_participantes(
    instituicao_id: UUID | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=500),
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> list[ParticipanteResponse]:
    return await ParticipanteService(session).list(
        actor=current_user,
        instituicao_id=instituicao_id,
        skip=skip,
        limit=limit,
    )


@router.get("/por-cpf", response_model=ParticipanteDetalheResponse)
async def get_participante_por_cpf(
    documento: str = Query(..., min_length=11, max_length=18),
    instituicao_id: UUID | None = Query(default=None),
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> ParticipanteDetalheResponse:
    return await ParticipanteService(session).get_by_cpf(
        documento,
        actor=current_user,
        instituicao_id=instituicao_id,
    )


@router.get("/{participante_id}", response_model=ParticipanteDetalheResponse)
async def get_participante(
    participante_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> ParticipanteDetalheResponse:
    return await ParticipanteService(session).get(participante_id, actor=current_user)


@router.post("/{participante_id}/aprovar", response_model=ParticipanteResponse)
async def aprovar_participante(
    participante_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> ParticipanteResponse:
    return await ParticipanteService(session).set_status(
        participante_id,
        ParticipanteStatus.VERIFIED,
        actor=current_user,
    )


@router.post("/{participante_id}/reprovar", response_model=ParticipanteResponse)
async def reprovar_participante(
    participante_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> ParticipanteResponse:
    return await ParticipanteService(session).set_status(
        participante_id,
        ParticipanteStatus.REJECTED,
        actor=current_user,
    )


@router.patch("/{participante_id}", response_model=ParticipanteResponse)
async def update_participante(
    participante_id: UUID,
    body: ParticipanteUpdate,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> ParticipanteResponse:
    return await ParticipanteService(session).update(
        participante_id,
        body,
        actor=current_user,
    )


@router.delete("/{participante_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_participante(
    participante_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> Response:
    await ParticipanteService(session).delete(participante_id, actor=current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
