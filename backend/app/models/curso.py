from __future__ import annotations

import enum
import uuid
from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.instituicao import Instituicao


class CursoStatus(str, enum.Enum):
    DRAFT = "draft"
    UPCOMING = "upcoming"
    COMPLETED = "completed"


class CursoCategoria(str, enum.Enum):
    TECHNOLOGY = "technology"
    BUSINESS = "business"
    DESIGN = "design"
    DATA_SCIENCE = "data_science"


class CursoModalidade(str, enum.Enum):
    ONLINE = "online"
    PRESENCIAL = "presencial"


class Curso(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "cursos"

    instituicao_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("instituicoes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False, default="")
    carga_horaria: Mapped[int] = mapped_column(nullable=False, default=0)
    instrutor: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    status: Mapped[CursoStatus] = mapped_column(
        Enum(
            CursoStatus,
            name="curso_status",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        nullable=False,
        default=CursoStatus.DRAFT,
    )
    data_evento: Mapped[date | None] = mapped_column(Date, nullable=True)
    categoria: Mapped[CursoCategoria | None] = mapped_column(
        Enum(
            CursoCategoria,
            name="curso_categoria",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        nullable=True,
    )
    modalidade: Mapped[CursoModalidade | None] = mapped_column(
        Enum(
            CursoModalidade,
            name="curso_modalidade",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        nullable=True,
    )
    tipo: Mapped[str | None] = mapped_column(String(64), nullable=True)

    instituicao: Mapped[Instituicao] = relationship(back_populates="cursos")
    certificados: Mapped[list[Certificado]] = relationship(back_populates="curso")
