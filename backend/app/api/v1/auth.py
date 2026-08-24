from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.usuario import Usuario
from app.schemas.auth import (
    AlterarSenhaRequest,
    LoginRequest,
    RecuperarSenhaRequest,
    RedefinirSenhaRequest,
    TokenResponse,
    UsuarioResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    session: AsyncSession = Depends(get_db),
) -> TokenResponse:
    return await AuthService(session).login(body.email, body.password)


@router.get("/me", response_model=UsuarioResponse)
async def me(current_user: Usuario = Depends(get_current_user)) -> UsuarioResponse:
    return AuthService.to_response(current_user)


@router.post("/alterar-senha", status_code=status.HTTP_204_NO_CONTENT)
async def alterar_senha(
    body: AlterarSenhaRequest,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> Response:
    await AuthService(session).alterar_senha(
        current_user,
        senha_atual=body.senha_atual,
        senha_nova=body.senha_nova,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/recuperar-senha", status_code=status.HTTP_204_NO_CONTENT)
async def recuperar_senha(
    body: RecuperarSenhaRequest,
    session: AsyncSession = Depends(get_db),
) -> Response:
    await AuthService(session).solicitar_recuperacao(str(body.email))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/redefinir-senha", status_code=status.HTTP_204_NO_CONTENT)
async def redefinir_senha(
    body: RedefinirSenhaRequest,
    session: AsyncSession = Depends(get_db),
) -> Response:
    await AuthService(session).redefinir_senha(body.token, body.senha_nova)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
