"""initial schema multi-tenant

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-08-11

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# create_type=False evita CREATE TYPE duplicado no create_table
instituicao_status = postgresql.ENUM(
    "active",
    "pending_review",
    "suspended",
    name="instituicao_status",
    create_type=False,
)
usuario_role = postgresql.ENUM(
    "super_admin",
    "instituicao_admin",
    name="usuario_role",
    create_type=False,
)
curso_status = postgresql.ENUM(
    "draft",
    "upcoming",
    "completed",
    name="curso_status",
    create_type=False,
)
aluno_status = postgresql.ENUM(
    "pending",
    "verified",
    name="aluno_status",
    create_type=False,
)
certificado_status = postgresql.ENUM(
    "active",
    "revoked",
    "expired",
    name="certificado_status",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    instituicao_status.create(bind, checkfirst=True)
    usuario_role.create(bind, checkfirst=True)
    curso_status.create(bind, checkfirst=True)
    aluno_status.create(bind, checkfirst=True)
    certificado_status.create(bind, checkfirst=True)

    op.create_table(
        "instituicoes",
        sa.Column("nome", sa.String(length=255), nullable=False),
        sa.Column("codigo", sa.String(length=64), nullable=False),
        sa.Column("cnpj", sa.String(length=18), nullable=False),
        sa.Column("endereco", sa.Text(), nullable=False),
        sa.Column("responsavel", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("telefone", sa.String(length=32), nullable=False),
        sa.Column("logo_url", sa.String(length=512), nullable=True),
        sa.Column("assinatura_url", sa.String(length=512), nullable=True),
        sa.Column("status", instituicao_status, nullable=False),
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
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_instituicoes")),
        sa.UniqueConstraint("cnpj", name=op.f("uq_instituicoes_cnpj")),
        sa.UniqueConstraint("codigo", name=op.f("uq_instituicoes_codigo")),
    )
    op.create_index(op.f("ix_instituicoes_codigo"), "instituicoes", ["codigo"], unique=False)

    op.create_table(
        "usuarios",
        sa.Column("instituicao_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("nome", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", usuario_role, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
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
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["instituicao_id"],
            ["instituicoes.id"],
            name=op.f("fk_usuarios_instituicao_id_instituicoes"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_usuarios")),
        sa.UniqueConstraint("email", name=op.f("uq_usuarios_email")),
    )
    op.create_index(op.f("ix_usuarios_email"), "usuarios", ["email"], unique=False)
    op.create_index(
        op.f("ix_usuarios_instituicao_id"),
        "usuarios",
        ["instituicao_id"],
        unique=False,
    )

    op.create_table(
        "cursos",
        sa.Column("instituicao_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("titulo", sa.String(length=255), nullable=False),
        sa.Column("descricao", sa.Text(), nullable=False),
        sa.Column("carga_horaria", sa.Integer(), nullable=False),
        sa.Column("instrutor", sa.String(length=255), nullable=False),
        sa.Column("status", curso_status, nullable=False),
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
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["instituicao_id"],
            ["instituicoes.id"],
            name=op.f("fk_cursos_instituicao_id_instituicoes"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_cursos")),
    )
    op.create_index(
        op.f("ix_cursos_instituicao_id"),
        "cursos",
        ["instituicao_id"],
        unique=False,
    )

    op.create_table(
        "alunos",
        sa.Column("instituicao_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nome", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("documento", sa.String(length=64), nullable=False),
        sa.Column("status", aluno_status, nullable=False),
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
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["instituicao_id"],
            ["instituicoes.id"],
            name=op.f("fk_alunos_instituicao_id_instituicoes"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_alunos")),
        sa.UniqueConstraint(
            "instituicao_id",
            "documento",
            name="uq_alunos_instituicao_documento",
        ),
        sa.UniqueConstraint(
            "instituicao_id",
            "email",
            name="uq_alunos_instituicao_email",
        ),
    )
    op.create_index(
        op.f("ix_alunos_instituicao_id"),
        "alunos",
        ["instituicao_id"],
        unique=False,
    )

    op.create_table(
        "certificados",
        sa.Column("codigo_validacao", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("instituicao_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("curso_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("aluno_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("numero_certificado", sa.String(length=64), nullable=False),
        sa.Column("aluno_nome", sa.String(length=255), nullable=False),
        sa.Column("curso_titulo", sa.String(length=255), nullable=False),
        sa.Column("instituicao_nome", sa.String(length=255), nullable=False),
        sa.Column("carga_horaria", sa.Integer(), nullable=False),
        sa.Column("instrutor", sa.String(length=255), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=True),
        sa.Column("status", certificado_status, nullable=False),
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
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["aluno_id"],
            ["alunos.id"],
            name=op.f("fk_certificados_aluno_id_alunos"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["curso_id"],
            ["cursos.id"],
            name=op.f("fk_certificados_curso_id_cursos"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["instituicao_id"],
            ["instituicoes.id"],
            name=op.f("fk_certificados_instituicao_id_instituicoes"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_certificados")),
        sa.UniqueConstraint(
            "codigo_validacao",
            name=op.f("uq_certificados_codigo_validacao"),
        ),
        sa.UniqueConstraint(
            "numero_certificado",
            name=op.f("uq_certificados_numero_certificado"),
        ),
    )
    op.create_index(
        op.f("ix_certificados_aluno_id"),
        "certificados",
        ["aluno_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_certificados_codigo_validacao"),
        "certificados",
        ["codigo_validacao"],
        unique=False,
    )
    op.create_index(
        op.f("ix_certificados_curso_id"),
        "certificados",
        ["curso_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_certificados_instituicao_id"),
        "certificados",
        ["instituicao_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_certificados_instituicao_id"), table_name="certificados")
    op.drop_index(op.f("ix_certificados_curso_id"), table_name="certificados")
    op.drop_index(op.f("ix_certificados_codigo_validacao"), table_name="certificados")
    op.drop_index(op.f("ix_certificados_aluno_id"), table_name="certificados")
    op.drop_table("certificados")

    op.drop_index(op.f("ix_alunos_instituicao_id"), table_name="alunos")
    op.drop_table("alunos")

    op.drop_index(op.f("ix_cursos_instituicao_id"), table_name="cursos")
    op.drop_table("cursos")

    op.drop_index(op.f("ix_usuarios_instituicao_id"), table_name="usuarios")
    op.drop_index(op.f("ix_usuarios_email"), table_name="usuarios")
    op.drop_table("usuarios")

    op.drop_index(op.f("ix_instituicoes_codigo"), table_name="instituicoes")
    op.drop_table("instituicoes")

    bind = op.get_bind()
    certificado_status.drop(bind, checkfirst=True)
    aluno_status.drop(bind, checkfirst=True)
    curso_status.drop(bind, checkfirst=True)
    usuario_role.drop(bind, checkfirst=True)
    instituicao_status.drop(bind, checkfirst=True)
