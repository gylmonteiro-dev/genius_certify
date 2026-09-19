"""enrollment-level rejection with visible justification

Revision ID: 015_inscricao_reprovada
Revises: 014_perfil_participante
Create Date: 2026-09-19

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "015_inscricao_reprovada"
down_revision: Union[str, None] = "014_perfil_participante"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "inscricoes",
        sa.Column(
            "reprovada",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "inscricoes",
        sa.Column("reprovada_em", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "inscricoes",
        sa.Column("reprovada_justificativa", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("inscricoes", "reprovada_justificativa")
    op.drop_column("inscricoes", "reprovada_em")
    op.drop_column("inscricoes", "reprovada")
