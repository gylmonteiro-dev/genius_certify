from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.usuario import Usuario, UsuarioRole


class UsuarioRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_email(self, email: str) -> Usuario | None:
        stmt = select(Usuario).where(Usuario.email == email.lower())
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: UUID) -> Usuario | None:
        stmt = select(Usuario).where(Usuario.id == user_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(
        self,
        *,
        nome: str,
        email: str,
        hashed_password: str,
        role: UsuarioRole,
        instituicao_id: UUID | None = None,
        is_active: bool = True,
    ) -> Usuario:
        usuario = Usuario(
            nome=nome,
            email=email.lower(),
            hashed_password=hashed_password,
            role=role,
            instituicao_id=instituicao_id,
            is_active=is_active,
        )
        self._session.add(usuario)
        await self._session.flush()
        await self._session.refresh(usuario)
        return usuario
