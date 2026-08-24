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

    async def save(self, usuario: Usuario) -> Usuario:
        await self._session.flush()
        await self._session.refresh(usuario)
        return usuario

    async def get_instituicao_admin(self, instituicao_id: UUID) -> Usuario | None:
        stmt = (
            select(Usuario)
            .where(
                Usuario.instituicao_id == instituicao_id,
                Usuario.role == UsuarioRole.INSTITUICAO_ADMIN,
            )
            .order_by(Usuario.created_at.asc())
            .limit(1)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def map_instituicao_admins(
        self,
        instituicao_ids: list[UUID],
    ) -> dict[UUID, Usuario]:
        if not instituicao_ids:
            return {}
        stmt = (
            select(Usuario)
            .where(
                Usuario.instituicao_id.in_(instituicao_ids),
                Usuario.role == UsuarioRole.INSTITUICAO_ADMIN,
            )
            .order_by(Usuario.created_at.asc())
        )
        result = await self._session.execute(stmt)
        mapping: dict[UUID, Usuario] = {}
        for user in result.scalars().all():
            if user.instituicao_id is not None and user.instituicao_id not in mapping:
                mapping[user.instituicao_id] = user
        return mapping
