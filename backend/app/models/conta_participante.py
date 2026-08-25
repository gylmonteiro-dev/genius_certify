from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column


class ContaParticipante(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Conta global do participante (CPF + senha), independente do tenant admin."""

    __tablename__ = "contas_participantes"

    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    documento: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)
