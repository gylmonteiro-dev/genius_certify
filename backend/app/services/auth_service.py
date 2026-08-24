import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import AppError, UnauthorizedError
from app.core.security import create_access_token, hash_password, verify_password
from app.models.usuario import Usuario, UsuarioRole
from app.repositories.password_reset_repository import PasswordResetRepository
from app.repositories.usuario_repository import UsuarioRepository
from app.schemas.auth import TokenResponse, UsuarioResponse
from app.services.email_service import EmailService

RESET_TOKEN_TTL = timedelta(hours=1)


def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self._usuarios = UsuarioRepository(session)
        self._resets = PasswordResetRepository(session)
        self._session = session
        self._email = EmailService()

    async def login(self, email: str, password: str) -> TokenResponse:
        usuario = await self._usuarios.get_by_email(email)
        if usuario is None or not usuario.is_active:
            raise UnauthorizedError()
        if not verify_password(password, usuario.hashed_password):
            raise UnauthorizedError()

        token = create_access_token(
            subject=usuario.id,
            email=usuario.email,
            role=usuario.role.value,
            instituicao_id=usuario.instituicao_id,
        )
        return TokenResponse(access_token=token)

    async def get_usuario_by_id(self, user_id: UUID) -> Usuario:
        usuario = await self._usuarios.get_by_id(user_id)
        if usuario is None or not usuario.is_active:
            raise UnauthorizedError("Usuário inválido ou inativo")
        return usuario

    async def alterar_senha(
        self,
        usuario: Usuario,
        *,
        senha_atual: str,
        senha_nova: str,
    ) -> None:
        if not verify_password(senha_atual, usuario.hashed_password):
            raise UnauthorizedError("Senha atual inválida")
        if senha_atual == senha_nova:
            raise AppError("A nova senha deve ser diferente da atual")
        usuario.hashed_password = hash_password(senha_nova)
        await self._usuarios.save(usuario)
        await self._session.commit()

    async def solicitar_recuperacao(self, email: str) -> None:
        usuario = await self._usuarios.get_by_email(email)
        if usuario is None or not usuario.is_active:
            return

        await self._resets.invalidate_unused_for_user(usuario.id)
        raw_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + RESET_TOKEN_TTL
        await self._resets.create(
            usuario_id=usuario.id,
            token_hash=_hash_reset_token(raw_token),
            expires_at=expires_at,
        )
        await self._session.commit()

        settings = get_settings()
        base = settings.public_app_url.rstrip("/")
        link = f"{base}/entrar/redefinir?token={raw_token}"
        await self._email.send_password_reset(
            to=usuario.email,
            nome=usuario.nome,
            link=link,
        )

    async def redefinir_senha(self, token: str, senha_nova: str) -> None:
        record = await self._resets.get_by_token_hash(_hash_reset_token(token.strip()))
        now = datetime.now(timezone.utc)
        if (
            record is None
            or record.used_at is not None
            or record.expires_at <= now
        ):
            raise AppError("Link de recuperação inválido ou expirado")

        usuario = await self._usuarios.get_by_id(record.usuario_id)
        if usuario is None or not usuario.is_active:
            raise AppError("Link de recuperação inválido ou expirado")

        usuario.hashed_password = hash_password(senha_nova)
        record.used_at = now
        await self._usuarios.save(usuario)
        await self._resets.save(record)
        await self._session.commit()

    @staticmethod
    def to_response(usuario: Usuario) -> UsuarioResponse:
        return UsuarioResponse.model_validate(usuario)

    async def ensure_superadmin(
        self,
        *,
        email: str,
        password: str,
        nome: str,
    ) -> Usuario:
        existing = await self._usuarios.get_by_email(email)
        if existing is not None:
            return existing

        usuario = await self._usuarios.create(
            nome=nome,
            email=email,
            hashed_password=hash_password(password),
            role=UsuarioRole.SUPER_ADMIN,
            instituicao_id=None,
            is_active=True,
        )
        await self._session.commit()
        return usuario
