from collections.abc import Callable
from uuid import UUID

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import (
    PARTICIPANTE_TOKEN_TYP,
    TokenDecodeError,
    safe_decode_access_token,
)
from app.models.conta_participante import ContaParticipante
from app.models.usuario import Usuario, UsuarioRole
from app.services.auth_service import AuthService
from app.services.conta_participante_service import ContaParticipanteService

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_db),
) -> Usuario:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise UnauthorizedError("Token de autenticação ausente")

    try:
        payload = safe_decode_access_token(credentials.credentials)
    except TokenDecodeError as exc:
        raise UnauthorizedError(str(exc)) from exc

    if payload.get("typ") == PARTICIPANTE_TOKEN_TYP:
        raise UnauthorizedError("Token de participante não autorizado nesta rota")

    subject = payload.get("sub")
    if not subject:
        raise UnauthorizedError("Token sem subject")

    try:
        user_id = UUID(subject)
    except ValueError as exc:
        raise UnauthorizedError("Subject do token inválido") from exc

    return await AuthService(session).get_usuario_by_id(user_id)


def require_roles(*roles: UsuarioRole) -> Callable[..., Usuario]:
    allowed = set(roles)

    async def _dependency(
        current_user: Usuario = Depends(get_current_user),
    ) -> Usuario:
        if current_user.role not in allowed:
            raise ForbiddenError()
        return current_user

    return _dependency


RequireSuperAdmin = require_roles(UsuarioRole.SUPER_ADMIN)
RequireInstituicaoAdmin = require_roles(
    UsuarioRole.SUPER_ADMIN,
    UsuarioRole.INSTITUICAO_ADMIN,
)


async def get_current_conta_participante(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_db),
) -> ContaParticipante:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise UnauthorizedError("Token de autenticação ausente")

    try:
        payload = safe_decode_access_token(credentials.credentials)
    except TokenDecodeError as exc:
        raise UnauthorizedError(str(exc)) from exc

    if payload.get("typ") != PARTICIPANTE_TOKEN_TYP:
        raise UnauthorizedError("Token de participante inválido")

    subject = payload.get("sub")
    if not subject:
        raise UnauthorizedError("Token sem subject")

    try:
        conta_id = UUID(subject)
    except ValueError as exc:
        raise UnauthorizedError("Subject do token inválido") from exc

    return await ContaParticipanteService(session).get_conta_by_id(conta_id)
