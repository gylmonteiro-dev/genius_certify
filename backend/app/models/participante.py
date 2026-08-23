from __future__ import annotations

import enum
import uuid
from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.instituicao import Instituicao


class ParticipanteStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class Participante(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "participantes"
    __table_args__ = (
        UniqueConstraint("instituicao_id", "email", name="uq_participantes_instituicao_email"),
        UniqueConstraint(
            "instituicao_id",
            "documento",
            name="uq_participantes_instituicao_documento",
        ),
        Index(
            "ix_participantes_documento_data_nascimento",
            "documento",
            "data_nascimento",
        ),
    )

    instituicao_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("instituicoes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    documento: Mapped[str] = mapped_column(String(64), nullable=False)
    data_nascimento: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[ParticipanteStatus] = mapped_column(
        Enum(
            ParticipanteStatus,
            name="aluno_status",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        nullable=False,
        default=ParticipanteStatus.PENDING,
    )

    instituicao: Mapped[Instituicao] = relationship(back_populates="participantes")
    certificados: Mapped[list[Certificado]] = relationship(back_populates="participante")
    inscricoes: Mapped[list[Inscricao]] = relationship(back_populates="participante")
