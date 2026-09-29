from __future__ import annotations

import enum
import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.curso_colaborador import ExibicaoColaboradores
from app.models.instituicao import Instituicao

if TYPE_CHECKING:
    from app.models.curso_colaborador import CursoColaborador
    from app.models.curso_data import CursoData


class CursoStatus(str, enum.Enum):
    DRAFT = "draft"
    UPCOMING = "upcoming"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


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
    exibicao_colaboradores: Mapped[ExibicaoColaboradores] = mapped_column(
        Enum(
            ExibicaoColaboradores,
            name="exibicao_colaboradores",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        nullable=False,
        default=ExibicaoColaboradores.AUTOMATICO,
        server_default=ExibicaoColaboradores.AUTOMATICO.value,
    )
    status: Mapped[CursoStatus] = mapped_column(
        Enum(
            CursoStatus,
            name="curso_status",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        nullable=False,
        default=CursoStatus.DRAFT,
    )
    # Alias da primeira data em ``datas``. A coluna sai numa migration posterior.
    data_evento: Mapped[date | None] = mapped_column(Date, nullable=True)
    categoria: Mapped[str | None] = mapped_column(String(64), nullable=True)
    modalidade: Mapped[str | None] = mapped_column(String(64), nullable=True)
    tipo: Mapped[str | None] = mapped_column(String(64), nullable=True)
    template_id: Mapped[str] = mapped_column(String(64), nullable=False, default="classic")
    frente_tipo: Mapped[str] = mapped_column(String(32), nullable=False, default="conclusao")
    frente_titulo: Mapped[str | None] = mapped_column(String(255), nullable=True)
    frente_atestacao: Mapped[str | None] = mapped_column(String(255), nullable=True)
    exigir_conclusao_para_emitir: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    emissao_liberada: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    verso_parcerias: Mapped[str | None] = mapped_column(Text, nullable=True)
    verso_conteudos: Mapped[str | None] = mapped_column(Text, nullable=True)
    verso_observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    limite_participantes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cancelamento_justificativa: Mapped[str | None] = mapped_column(Text, nullable=True)
    cancelado_em: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    instituicao: Mapped[Instituicao] = relationship(back_populates="cursos")
    certificados: Mapped[list[Certificado]] = relationship(back_populates="curso")
    inscricoes: Mapped[list[Inscricao]] = relationship(back_populates="curso")
    datas: Mapped[list[CursoData]] = relationship(
        back_populates="curso",
        cascade="all, delete-orphan",
        order_by="CursoData.data",
        lazy="selectin",
    )
    colaboradores: Mapped[list[CursoColaborador]] = relationship(
        back_populates="curso",
        cascade="all, delete-orphan",
        order_by="CursoColaborador.ordem",
        lazy="selectin",
    )

    @property
    def datas_evento(self) -> list[date]:
        return [item.data for item in self.datas]
