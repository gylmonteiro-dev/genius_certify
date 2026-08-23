from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.participante import Participante
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.curso import Curso
from app.models.instituicao import Instituicao


class Inscricao(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Vínculo participante ↔ evento (curso) no tenant. Base da emissão de certificado."""

    __tablename__ = "inscricoes"
    __table_args__ = (
        UniqueConstraint(
            "participante_id",
            "curso_id",
            name="uq_inscricoes_participante_curso",
        ),
    )

    instituicao_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("instituicoes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    participante_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("participantes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    curso_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cursos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    instituicao: Mapped[Instituicao] = relationship(back_populates="inscricoes")
    participante: Mapped[Participante] = relationship(back_populates="inscricoes")
    curso: Mapped[Curso] = relationship(back_populates="inscricoes")
