from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_conta_participante
from app.models.conta_participante import ContaParticipante
from app.schemas.auth import AlterarSenhaRequest, TokenResponse
from app.schemas.conta_participante import (
    ContaParticipanteCadastrarRequest,
    ContaParticipanteInscricaoItem,
    ContaParticipanteLoginRequest,
    ContaParticipanteResponse,
)
from app.services.conta_participante_service import ContaParticipanteService

router = APIRouter(prefix="/participante", tags=["participante"])


@router.post("/cadastrar", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def cadastrar_conta_participante(
    body: ContaParticipanteCadastrarRequest,
    session: AsyncSession = Depends(get_db),
) -> TokenResponse:
    return await ContaParticipanteService(session).cadastrar(body)


@router.post("/login", response_model=TokenResponse)
async def login_conta_participante(
    body: ContaParticipanteLoginRequest,
    session: AsyncSession = Depends(get_db),
) -> TokenResponse:
    return await ContaParticipanteService(session).login(body.documento, body.senha)


@router.get("/me", response_model=ContaParticipanteResponse)
async def me_conta_participante(
    conta: ContaParticipante = Depends(get_current_conta_participante),
) -> ContaParticipanteResponse:
    return ContaParticipanteService.to_response(conta)


@router.post("/alterar-senha", status_code=status.HTTP_204_NO_CONTENT)
async def alterar_senha_conta_participante(
    body: AlterarSenhaRequest,
    session: AsyncSession = Depends(get_db),
    conta: ContaParticipante = Depends(get_current_conta_participante),
) -> Response:
    await ContaParticipanteService(session).alterar_senha(conta, body)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/inscricoes", response_model=list[ContaParticipanteInscricaoItem])
async def list_minhas_inscricoes(
    session: AsyncSession = Depends(get_db),
    conta: ContaParticipante = Depends(get_current_conta_participante),
) -> list[ContaParticipanteInscricaoItem]:
    return await ContaParticipanteService(session).list_inscricoes(conta)


@router.delete("/inscricoes/{inscricao_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancelar_minha_inscricao(
    inscricao_id: UUID,
    session: AsyncSession = Depends(get_db),
    conta: ContaParticipante = Depends(get_current_conta_participante),
) -> Response:
    await ContaParticipanteService(session).cancelar_inscricao(conta, inscricao_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
