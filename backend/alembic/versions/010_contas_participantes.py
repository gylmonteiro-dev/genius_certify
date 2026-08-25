"""contas globais do participante

Revision ID: 010_contas_participantes
Revises: 009_password_reset_tokens
Create Date: 2026-08-25

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "010_contas_participantes"
down_revision: Union[str, None] = "009_password_reset_tokens"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "contas_participantes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nome", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("documento", sa.String(length=64), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
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
        sa.PrimaryKeyConstraint("id", name=op.f("pk_contas_participantes")),
        sa.UniqueConstraint("email", name=op.f("uq_contas_participantes_email")),
        sa.UniqueConstraint("documento", name=op.f("uq_contas_participantes_documento")),
    )
    op.create_index(
        op.f("ix_contas_participantes_email"),
        "contas_participantes",
        ["email"],
        unique=False,
    )
    op.create_index(
        op.f("ix_contas_participantes_documento"),
        "contas_participantes",
        ["documento"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_contas_participantes_documento"),
        table_name="contas_participantes",
    )
    op.drop_index(
        op.f("ix_contas_participantes_email"),
        table_name="contas_participantes",
    )
    op.drop_table("contas_participantes")
