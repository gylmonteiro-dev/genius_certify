from __future__ import annotations

import enum
import uuid
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Column, Enum, ForeignKey, Integer, String, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.curso import Curso
    from app.models.curso_data import CursoData


class ColaboradorFuncao(str, enum.Enum):
    INSTRUTOR = "instrutor"
    PALESTRANTE = "palestrante"
    FACILITADOR = "facilitador"
    MEDIADOR = "mediador"
    OUTRA = "outra"


class ExibicaoColaboradores(str, enum.Enum):
    AUTOMATICO = "automatico"
    SOMENTE_VERSO = "somente_verso"
    NAO_EXIBIR = "nao_exibir"


curso_colaborador_datas = Table(
    "curso_colaborador_datas",
    Base.metadata,
    Column(
        "colaborador_id",
        UUID(as_uuid=True),
        ForeignKey("curso_colaboradores.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "curso_data_id",
        UUID(as_uuid=True),
        ForeignKey("curso_datas.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class CursoColaborador(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Profissional vinculado ao evento.

    Uma pessoa pode participar em mais de uma data sem cadastro duplicado.
    """

    __tablename__ = "curso_colaboradores"

    curso_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cursos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    funcao: Mapped[ColaboradorFuncao] = mapped_column(
        Enum(
            ColaboradorFuncao,
            name="colaborador_funcao",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        nullable=False,
    )
    funcao_personalizada: Mapped[str | None] = mapped_column(String(80), nullable=True)
    tema_atividade: Mapped[str | None] = mapped_column(String(180), nullable=True)
    ordem: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    curso: Mapped[Curso] = relationship("Curso", back_populates="colaboradores")
    datas: Mapped[list[CursoData]] = relationship(
        "CursoData",
        secondary=curso_colaborador_datas,
        order_by="CursoData.data",
        lazy="selectin",
        passive_deletes=True,
    )

    @property
    def datas_evento(self) -> list[date]:
        return [item.data for item in self.datas]
