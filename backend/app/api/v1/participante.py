from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_conta_participante
from app.models.conta_participante import ContaParticipante
from app.schemas.auth import (
    AlterarSenhaRequest,
    RecuperarSenhaRequest,
    RedefinirSenhaRequest,
    TokenResponse,
)
from app.schemas.conta_participante import (
    ContaParticipanteAtualizarPerfilRequest,
    ContaParticipanteCadastrarRequest,
    ContaParticipanteInscricaoItem,
    ContaParticipanteLoginRequest,
    ContaParticipanteResponse,
)
from app.services.conta_participante_service import ContaParticipanteService

router = APIRouter(prefix="/participante", tags=["participante"])


def _request_context(request: Request) -> tuple[str | None, str | None]:
    ip = request.client.host if request.client is not None else None
    user_agent = request.headers.get("user-agent")
    return ip, user_agent[:512] if user_agent else None


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


@router.patch("/me", response_model=ContaParticipanteResponse)
async def atualizar_perfil_conta_participante(
    body: ContaParticipanteAtualizarPerfilRequest,
    request: Request,
    session: AsyncSession = Depends(get_db),
    conta: ContaParticipante = Depends(get_current_conta_participante),
) -> ContaParticipanteResponse:
    ip, user_agent = _request_context(request)
    return await ContaParticipanteService(session).atualizar_perfil(
        conta,
        body,
        ip=ip,
        user_agent=user_agent,
    )


@router.post("/alterar-senha", status_code=status.HTTP_204_NO_CONTENT)
async def alterar_senha_conta_participante(
    body: AlterarSenhaRequest,
    request: Request,
    session: AsyncSession = Depends(get_db),
    conta: ContaParticipante = Depends(get_current_conta_participante),
) -> Response:
    ip, user_agent = _request_context(request)
    await ContaParticipanteService(session).alterar_senha(
        conta,
        body,
        ip=ip,
        user_agent=user_agent,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/recuperar-senha", status_code=status.HTTP_204_NO_CONTENT)
async def recuperar_senha_conta_participante(
    body: RecuperarSenhaRequest,
    request: Request,
    session: AsyncSession = Depends(get_db),
) -> Response:
    ip, user_agent = _request_context(request)
    await ContaParticipanteService(session).solicitar_recuperacao(
        str(body.email),
        ip=ip,
        user_agent=user_agent,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/redefinir-senha", status_code=status.HTTP_204_NO_CONTENT)
async def redefinir_senha_conta_participante(
    body: RedefinirSenhaRequest,
    request: Request,
    session: AsyncSession = Depends(get_db),
) -> Response:
    ip, user_agent = _request_context(request)
    await ContaParticipanteService(session).redefinir_senha(
        body.token,
        body.senha_nova,
        ip=ip,
        user_agent=user_agent,
    )
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
