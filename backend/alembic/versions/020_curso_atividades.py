"""atividades internas do evento

Revision ID: 020_curso_atividades
Revises: 019_curso_capa
Create Date: 2026-10-07

Eventos existentes ficam sem atividades. Certificados já emitidos
permanecem com ``atividades`` nulo e não ganham seção no verso.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "020_curso_atividades"
down_revision: Union[str, None] = "019_curso_capa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

curso_atividade_tipo = postgresql.ENUM(
    "oficina",
    "palestra",
    "minicurso",
    "mesa_redonda",
    "atividade_pratica",
    "outro",
    name="curso_atividade_tipo",
    create_type=False,
)
curso_atividade_status = postgresql.ENUM(
    "ativa",
    "inativa",
    "cancelada",
    "encerrada",
    name="curso_atividade_status",
    create_type=False,
)
inscricao_atividade_status = postgresql.ENUM(
    "selecionada",
    "confirmada",
    "presente",
    "ausente",
    "cancelada",
    name="inscricao_atividade_status",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    curso_atividade_tipo.create(bind, checkfirst=True)
    curso_atividade_status.create(bind, checkfirst=True)
    inscricao_atividade_status.create(bind, checkfirst=True)

    op.add_column(
        "cursos",
        sa.Column(
            "permite_varias_atividades",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "cursos",
        sa.Column(
            "atividade_obrigatoria",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "cursos",
        sa.Column(
            "permitir_selecao_participante",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )
    op.add_column(
        "cursos",
        sa.Column("selecao_atividades_ate", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "cursos",
        sa.Column(
            "certificado_exige_presenca_atividade",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "certificados",
        sa.Column("atividades", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )

    op.create_table(
        "curso_atividades",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("instituicao_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("curso_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("titulo", sa.String(length=255), nullable=False),
        sa.Column("descricao", sa.Text(), nullable=False, server_default=""),
        sa.Column("tipo", curso_atividade_tipo, nullable=False),
        sa.Column("tipo_personalizado", sa.String(length=80), nullable=True),
        sa.Column("data", sa.Date(), nullable=False),
        sa.Column("hora_inicio", sa.Time(), nullable=True),
        sa.Column("hora_fim", sa.Time(), nullable=True),
        sa.Column("carga_horaria", sa.Integer(), nullable=True),
        sa.Column("local", sa.String(length=180), nullable=True),
        sa.Column("limite_participantes", sa.Integer(), nullable=True),
        sa.Column("status", curso_atividade_status, nullable=False),
        sa.Column("ordem", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "length(btrim(titulo)) > 0",
            name="ck_curso_atividades_titulo_nao_vazio",
        ),
        sa.CheckConstraint("ordem >= 0", name="ck_curso_atividades_ordem_nao_negativa"),
        sa.CheckConstraint(
            "carga_horaria IS NULL OR carga_horaria >= 1",
            name="ck_curso_atividades_carga_horaria",
        ),
        sa.CheckConstraint(
            "limite_participantes IS NULL OR limite_participantes >= 1",
            name="ck_curso_atividades_limite_participantes",
        ),
        sa.CheckConstraint(
            "("
            "tipo <> 'outro' "
            "OR ("
            "tipo_personalizado IS NOT NULL "
            "AND length(btrim(tipo_personalizado)) > 0"
            ")"
            ")",
            name="ck_curso_atividades_tipo_personalizado",
        ),
        sa.CheckConstraint(
            "hora_inicio IS NULL OR hora_fim IS NULL OR hora_fim > hora_inicio",
            name="ck_curso_atividades_horario",
        ),
        sa.ForeignKeyConstraint(
            ["instituicao_id"],
            ["instituicoes.id"],
            name="fk_curso_atividades_instituicao_id_instituicoes",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["curso_id"],
            ["cursos.id"],
            name="fk_curso_atividades_curso_id_cursos",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_curso_atividades"),
    )
    op.create_index(
        "ix_curso_atividades_instituicao_id",
        "curso_atividades",
        ["instituicao_id"],
    )
    op.create_index("ix_curso_atividades_curso_id", "curso_atividades", ["curso_id"])
    op.create_index(
        "ix_curso_atividades_instituicao_id_curso_id",
        "curso_atividades",
        ["instituicao_id", "curso_id"],
    )

    op.create_table(
        "curso_atividade_colaboradores",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("instituicao_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("curso_atividade_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("colaborador_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ordem", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "ordem >= 0",
            name="ck_curso_atividade_colaboradores_ordem_nao_negativa",
        ),
        sa.ForeignKeyConstraint(
            ["instituicao_id"],
            ["instituicoes.id"],
            name="fk_atv_colab_instituicao",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["curso_atividade_id"],
            ["curso_atividades.id"],
            name="fk_atv_colab_atividade",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["colaborador_id"],
            ["curso_colaboradores.id"],
            name="fk_atv_colab_colaborador",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_curso_atividade_colaboradores"),
        sa.UniqueConstraint(
            "curso_atividade_id",
            "colaborador_id",
            name="uq_curso_atividade_colaboradores_atividade_colaborador",
        ),
    )
    op.create_index(
        "ix_curso_atividade_colaboradores_instituicao_id",
        "curso_atividade_colaboradores",
        ["instituicao_id"],
    )
    op.create_index(
        "ix_curso_atividade_colaboradores_curso_atividade_id",
        "curso_atividade_colaboradores",
        ["curso_atividade_id"],
    )
    op.create_index(
        "ix_curso_atividade_colaboradores_colaborador_id",
        "curso_atividade_colaboradores",
        ["colaborador_id"],
    )

    op.create_table(
        "inscricao_atividades",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("instituicao_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("curso_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("curso_atividade_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("inscricao_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("participante_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", inscricao_atividade_status, nullable=False),
        sa.Column("selecionada_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("confirmada_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("presenca_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "certificado_habilitado",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["instituicao_id"],
            ["instituicoes.id"],
            name="fk_insc_atv_instituicao",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["curso_id"],
            ["cursos.id"],
            name="fk_insc_atv_curso",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["curso_atividade_id"],
            ["curso_atividades.id"],
            name="fk_insc_atv_atividade",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["inscricao_id"],
            ["inscricoes.id"],
            name="fk_insc_atv_inscricao",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["participante_id"],
            ["participantes.id"],
            name="fk_insc_atv_participante",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_inscricao_atividades"),
    )
    op.create_index(
        "ix_inscricao_atividades_instituicao_id",
        "inscricao_atividades",
        ["instituicao_id"],
    )
    op.create_index("ix_inscricao_atividades_curso_id", "inscricao_atividades", ["curso_id"])
    op.create_index(
        "ix_inscricao_atividades_curso_atividade_id",
        "inscricao_atividades",
        ["curso_atividade_id"],
    )
    op.create_index(
        "ix_inscricao_atividades_inscricao_id",
        "inscricao_atividades",
        ["inscricao_id"],
    )
    op.create_index(
        "ix_inscricao_atividades_participante_id",
        "inscricao_atividades",
        ["participante_id"],
    )
    op.create_index(
        "ix_inscricao_atividades_instituicao_id_curso_id",
        "inscricao_atividades",
        ["instituicao_id", "curso_id"],
    )
    op.create_index(
        "uq_inscricao_atividades_inscricao_atividade_ativa",
        "inscricao_atividades",
        ["inscricao_id", "curso_atividade_id"],
        unique=True,
        postgresql_where=sa.text("status <> 'cancelada'"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_inscricao_atividades_inscricao_atividade_ativa",
        table_name="inscricao_atividades",
    )
    op.drop_index(
        "ix_inscricao_atividades_instituicao_id_curso_id",
        table_name="inscricao_atividades",
    )
    op.drop_index(
        "ix_inscricao_atividades_participante_id",
        table_name="inscricao_atividades",
    )
    op.drop_index("ix_inscricao_atividades_inscricao_id", table_name="inscricao_atividades")
    op.drop_index(
        "ix_inscricao_atividades_curso_atividade_id",
        table_name="inscricao_atividades",
    )
    op.drop_index("ix_inscricao_atividades_curso_id", table_name="inscricao_atividades")
    op.drop_index(
        "ix_inscricao_atividades_instituicao_id",
        table_name="inscricao_atividades",
    )
    op.drop_table("inscricao_atividades")

    op.drop_index(
        "ix_curso_atividade_colaboradores_colaborador_id",
        table_name="curso_atividade_colaboradores",
    )
    op.drop_index(
        "ix_curso_atividade_colaboradores_curso_atividade_id",
        table_name="curso_atividade_colaboradores",
    )
    op.drop_index(
        "ix_curso_atividade_colaboradores_instituicao_id",
        table_name="curso_atividade_colaboradores",
    )
    op.drop_table("curso_atividade_colaboradores")

    op.drop_index(
        "ix_curso_atividades_instituicao_id_curso_id",
        table_name="curso_atividades",
    )
    op.drop_index("ix_curso_atividades_curso_id", table_name="curso_atividades")
    op.drop_index("ix_curso_atividades_instituicao_id", table_name="curso_atividades")
    op.drop_table("curso_atividades")

    op.drop_column("certificados", "atividades")
    op.drop_column("cursos", "certificado_exige_presenca_atividade")
    op.drop_column("cursos", "selecao_atividades_ate")
    op.drop_column("cursos", "permitir_selecao_participante")
    op.drop_column("cursos", "atividade_obrigatoria")
    op.drop_column("cursos", "permite_varias_atividades")

    bind = op.get_bind()
    postgresql.ENUM(name="inscricao_atividade_status").drop(bind, checkfirst=True)
    postgresql.ENUM(name="curso_atividade_status").drop(bind, checkfirst=True)
    postgresql.ENUM(name="curso_atividade_tipo").drop(bind, checkfirst=True)
