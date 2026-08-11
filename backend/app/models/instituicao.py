from __future__ import annotations

import enum

from sqlalchemy import Enum, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class InstituicaoStatus(str, enum.Enum):
    ACTIVE = "active"
    PENDING_REVIEW = "pending_review"
    SUSPENDED = "suspended"


class Instituicao(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "instituicoes"

    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    codigo: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    cnpj: Mapped[str] = mapped_column(String(18), unique=True, nullable=False)
    endereco: Mapped[str] = mapped_column(Text, nullable=False, default="")
    responsavel: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    telefone: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    # URLs no S3/MinIO — nunca Base64 no banco
    logo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    assinatura_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    status: Mapped[InstituicaoStatus] = mapped_column(
        Enum(
            InstituicaoStatus,
            name="instituicao_status",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        nullable=False,
        default=InstituicaoStatus.PENDING_REVIEW,
    )

    usuarios: Mapped[list[Usuario]] = relationship(back_populates="instituicao")
    cursos: Mapped[list[Curso]] = relationship(back_populates="instituicao")
    alunos: Mapped[list[Aluno]] = relationship(back_populates="instituicao")
    certificados: Mapped[list[Certificado]] = relationship(back_populates="instituicao")
