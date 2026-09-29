from __future__ import annotations

import uuid
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.curso import Curso


class CursoData(Base, UUIDPrimaryKeyMixin):
    """Uma data de realização do evento.

    A coleção substitui o uso isolado de ``cursos.data_evento``. A coluna
    legada permanece como alias da primeira data ordenada e será removida
    numa migration posterior.
    """

    __tablename__ = "curso_datas"
    __table_args__ = (
        UniqueConstraint("curso_id", "data", name="uq_curso_datas_curso_id_data"),
    )

    curso_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cursos.id", ondelete="CASCADE"),
        nullable=False,
    )
    data: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    curso: Mapped[Curso] = relationship("Curso", back_populates="datas")
