from __future__ import annotations

import enum
import uuid
from datetime import date, datetime, time

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Time,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.curso_colaborador import CursoColaborador


class AtividadeTipo(str, enum.Enum):
    OFICINA = "oficina"
    PALESTRA = "palestra"
    MINICURSO = "minicurso"
    MESA_REDONDA = "mesa_redonda"
    ATIVIDADE_PRATICA = "atividade_pratica"
    OUTRO = "outro"


class AtividadeStatus(str, enum.Enum):
    ATIVA = "ativa"
    INATIVA = "inativa"
    CANCELADA = "cancelada"
    ENCERRADA = "encerrada"


class InscricaoAtividadeStatus(str, enum.Enum):
    SELECIONADA = "selecionada"
    CONFIRMADA = "confirmada"
    PRESENTE = "presente"
    AUSENTE = "ausente"
    CANCELADA = "cancelada"


def _enum_values(enum_cls: type[enum.Enum]) -> list[str]:
    return [item.value for item in enum_cls]


class CursoAtividade(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Atividade interna de um evento. Não existe sem curso."""

    __tablename__ = "curso_atividades"
    __table_args__ = (
        CheckConstraint(
            "length(btrim(titulo)) > 0",
            name="ck_curso_atividades_titulo_nao_vazio",
        ),
        CheckConstraint("ordem >= 0", name="ck_curso_atividades_ordem_nao_negativa"),
        CheckConstraint(
            "carga_horaria IS NULL OR carga_horaria >= 1",
            name="ck_curso_atividades_carga_horaria",
        ),
        CheckConstraint(
            "limite_participantes IS NULL OR limite_participantes >= 1",
            name="ck_curso_atividades_limite_participantes",
        ),
        CheckConstraint(
            "("
            "tipo <> 'outro' "
            "OR ("
            "tipo_personalizado IS NOT NULL "
            "AND length(btrim(tipo_personalizado)) > 0"
            ")"
            ")",
            name="ck_curso_atividades_tipo_personalizado",
        ),
        CheckConstraint(
            "hora_inicio IS NULL OR hora_fim IS NULL OR hora_fim > hora_inicio",
            name="ck_curso_atividades_horario",
        ),
        Index("ix_curso_atividades_instituicao_id_curso_id", "instituicao_id", "curso_id"),
    )

    instituicao_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("instituicoes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    curso_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cursos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False, default="")
    tipo: Mapped[AtividadeTipo] = mapped_column(
        Enum(
            AtividadeTipo,
            name="curso_atividade_tipo",
            values_callable=_enum_values,
        ),
        nullable=False,
    )
    tipo_personalizado: Mapped[str | None] = mapped_column(String(80), nullable=True)
    data: Mapped[date] = mapped_column(Date, nullable=False)
    hora_inicio: Mapped[time | None] = mapped_column(Time, nullable=True)
    hora_fim: Mapped[time | None] = mapped_column(Time, nullable=True)
    carga_horaria: Mapped[int | None] = mapped_column(Integer, nullable=True)
    local: Mapped[str | None] = mapped_column(String(180), nullable=True)
    limite_participantes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[AtividadeStatus] = mapped_column(
        Enum(
            AtividadeStatus,
            name="curso_atividade_status",
            values_callable=_enum_values,
        ),
        nullable=False,
        default=AtividadeStatus.ATIVA,
    )
    ordem: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    responsaveis: Mapped[list[CursoAtividadeColaborador]] = relationship(
        back_populates="atividade",
        cascade="all, delete-orphan",
        order_by="CursoAtividadeColaborador.ordem",
        lazy="selectin",
    )


class CursoAtividadeColaborador(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Responsável da atividade, sempre um colaborador do mesmo evento."""

    __tablename__ = "curso_atividade_colaboradores"
    __table_args__ = (
        CheckConstraint(
            "ordem >= 0",
            name="ck_curso_atividade_colaboradores_ordem_nao_negativa",
        ),
        Index(
            "uq_curso_atividade_colaboradores_atividade_colaborador",
            "curso_atividade_id",
            "colaborador_id",
            unique=True,
        ),
    )

    instituicao_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("instituicoes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    curso_atividade_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("curso_atividades.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    colaborador_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("curso_colaboradores.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ordem: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    atividade: Mapped[CursoAtividade] = relationship(back_populates="responsaveis")
    colaborador: Mapped[CursoColaborador] = relationship(lazy="selectin")


class InscricaoAtividade(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Atividade escolhida ou realizada por uma inscrição do evento."""

    __tablename__ = "inscricao_atividades"
    __table_args__ = (
        Index(
            "uq_inscricao_atividades_inscricao_atividade_ativa",
            "inscricao_id",
            "curso_atividade_id",
            unique=True,
            postgresql_where=text("status <> 'cancelada'"),
        ),
        Index(
            "ix_inscricao_atividades_instituicao_id_curso_id",
            "instituicao_id",
            "curso_id",
        ),
    )

    instituicao_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("instituicoes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    curso_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cursos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    curso_atividade_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("curso_atividades.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    inscricao_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("inscricoes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    participante_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("participantes.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    status: Mapped[InscricaoAtividadeStatus] = mapped_column(
        Enum(
            InscricaoAtividadeStatus,
            name="inscricao_atividade_status",
            values_callable=_enum_values,
        ),
        nullable=False,
        default=InscricaoAtividadeStatus.SELECIONADA,
    )
    selecionada_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    confirmada_em: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    presenca_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    certificado_habilitado: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    atividade: Mapped[CursoAtividade] = relationship(lazy="selectin")
