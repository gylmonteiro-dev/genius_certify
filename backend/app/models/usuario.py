import enum
import uuid

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.instituicao import Instituicao


class UsuarioRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    INSTITUICAO_ADMIN = "instituicao_admin"


class Usuario(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "usuarios"

    instituicao_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("instituicoes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UsuarioRole] = mapped_column(
        Enum(
            UsuarioRole,
            name="usuario_role",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        nullable=False,
        default=UsuarioRole.INSTITUICAO_ADMIN,
    )
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)

    instituicao: Mapped[Instituicao | None] = relationship(back_populates="usuarios")
