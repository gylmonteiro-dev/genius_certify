import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ContaParticipanteAuditoria(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "conta_participante_auditoria"

    conta_participante_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("contas_participantes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    acao: Mapped[str] = mapped_column(String(64), nullable=False)
    detalhes: Mapped[dict[str, object]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
    )
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)
