"""inscricoes aluno-curso e travas de emissao

Revision ID: 003_inscricoes
Revises: 002_curso_event_fields
Create Date: 2026-08-23

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "003_inscricoes"
down_revision: Union[str, None] = "002_curso_event_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "cursos",
        sa.Column(
            "exigir_conclusao_para_emitir",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )
    op.add_column(
        "cursos",
        sa.Column(
            "emissao_liberada",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    op.create_table(
        "inscricoes",
        sa.Column("instituicao_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("aluno_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("curso_id", postgresql.UUID(as_uuid=True), nullable=False),
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
            name=op.f("fk_inscricoes_aluno_id_alunos"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["curso_id"],
            ["cursos.id"],
            name=op.f("fk_inscricoes_curso_id_cursos"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["instituicao_id"],
            ["instituicoes.id"],
            name=op.f("fk_inscricoes_instituicao_id_instituicoes"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_inscricoes")),
        sa.UniqueConstraint("aluno_id", "curso_id", name="uq_inscricoes_aluno_curso"),
    )
    op.create_index(
        op.f("ix_inscricoes_aluno_id"),
        "inscricoes",
        ["aluno_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_inscricoes_curso_id"),
        "inscricoes",
        ["curso_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_inscricoes_instituicao_id"),
        "inscricoes",
        ["instituicao_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_inscricoes_instituicao_id"), table_name="inscricoes")
    op.drop_index(op.f("ix_inscricoes_curso_id"), table_name="inscricoes")
    op.drop_index(op.f("ix_inscricoes_aluno_id"), table_name="inscricoes")
    op.drop_table("inscricoes")
    op.drop_column("cursos", "emissao_liberada")
    op.drop_column("cursos", "exigir_conclusao_para_emitir")
