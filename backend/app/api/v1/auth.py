from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.usuario import Usuario
from app.schemas.auth import LoginRequest, TokenResponse, UsuarioResponse
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
