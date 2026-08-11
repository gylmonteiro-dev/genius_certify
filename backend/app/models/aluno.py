from __future__ import annotations

import enum
import uuid

from sqlalchemy import Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.instituicao import Instituicao


class AlunoStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"


class Aluno(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "alunos"
    __table_args__ = (
        UniqueConstraint("instituicao_id", "email", name="uq_alunos_instituicao_email"),
        UniqueConstraint(
            "instituicao_id",
            "documento",
            name="uq_alunos_instituicao_documento",
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
    status: Mapped[AlunoStatus] = mapped_column(
        Enum(
            AlunoStatus,
            name="aluno_status",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        nullable=False,
        default=AlunoStatus.PENDING,
    )

    instituicao: Mapped[Instituicao] = relationship(back_populates="alunos")
    certificados: Mapped[list[Certificado]] = relationship(back_populates="aluno")
