"""participant profile, audit log and password reset

Revision ID: 014_perfil_participante
Revises: 013_certificado_acessos
Create Date: 2026-09-04

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "014_perfil_participante"
down_revision: Union[str, None] = "013_certificado_acessos"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "contas_participantes",
        sa.Column("data_nascimento", sa.Date(), nullable=True),
    )
    op.execute(
        sa.text(
            """
            UPDATE contas_participantes AS conta
            SET data_nascimento = origem.data_nascimento
            FROM (
                SELECT documento, MAX(data_nascimento) AS data_nascimento
                FROM participantes
                WHERE data_nascimento IS NOT NULL
                GROUP BY documento
            ) AS origem
            WHERE conta.documento = origem.documento
            """
        )
    )

    op.create_table(
        "conta_participante_auditoria",
        sa.Column("conta_participante_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("acao", sa.String(length=64), nullable=False),
        sa.Column(
            "detalhes",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("ip", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=512), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
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
            ["conta_participante_id"],
            ["contas_participantes.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_conta_participante_auditoria_conta_participante_id",
        "conta_participante_auditoria",
        ["conta_participante_id"],
    )

    op.create_table(
        "conta_participante_password_reset_tokens",
        sa.Column("conta_participante_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
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
            ["conta_participante_id"],
            ["contas_participantes.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(
        "ix_conta_participante_reset_conta_id",
        "conta_participante_password_reset_tokens",
        ["conta_participante_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_conta_participante_reset_conta_id",
        table_name="conta_participante_password_reset_tokens",
    )
    op.drop_table("conta_participante_password_reset_tokens")
    op.drop_index(
        "ix_conta_participante_auditoria_conta_participante_id",
        table_name="conta_participante_auditoria",
    )
    op.drop_table("conta_participante_auditoria")
    op.drop_column("contas_participantes", "data_nascimento")
