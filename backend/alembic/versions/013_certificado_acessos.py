"""certificate view and download access events

Revision ID: 013_certificado_acessos
Revises: 012_frente_certificado
Create Date: 2026-09-04

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "013_certificado_acessos"
down_revision: Union[str, None] = "012_frente_certificado"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    acesso_tipo = postgresql.ENUM(
        "visualizacao",
        "download",
        name="certificado_acesso_tipo",
        create_type=False,
    )
    acesso_tipo.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "certificado_acessos",
        sa.Column("certificado_id", sa.UUID(), nullable=False),
        sa.Column("instituicao_id", sa.UUID(), nullable=False),
        sa.Column("tipo", acesso_tipo, nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
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
            ["certificado_id"],
            ["certificados.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["instituicao_id"],
            ["instituicoes.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_certificado_acessos_certificado_id",
        "certificado_acessos",
        ["certificado_id"],
    )
    op.create_index(
        "ix_certificado_acessos_instituicao_id",
        "certificado_acessos",
        ["instituicao_id"],
    )
    op.create_index(
        "ix_certificado_acessos_instituicao_created_at",
        "certificado_acessos",
        ["instituicao_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_certificado_acessos_instituicao_created_at",
        table_name="certificado_acessos",
    )
    op.drop_index(
        "ix_certificado_acessos_instituicao_id",
        table_name="certificado_acessos",
    )
    op.drop_index(
        "ix_certificado_acessos_certificado_id",
        table_name="certificado_acessos",
    )
    op.drop_table("certificado_acessos")
    postgresql.ENUM(name="certificado_acesso_tipo").drop(
        op.get_bind(),
        checkfirst=True,
    )
