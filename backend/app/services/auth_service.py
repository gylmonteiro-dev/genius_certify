from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError, UnauthorizedError
from app.core.security import create_access_token, hash_password, verify_password
from app.models.usuario import Usuario, UsuarioRole
from app.repositories.usuario_repository import UsuarioRepository
from app.schemas.auth import TokenResponse, UsuarioResponse


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self._usuarios = UsuarioRepository(session)
        self._session = session

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
