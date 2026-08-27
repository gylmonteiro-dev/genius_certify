"""cancel event status and enrollment cancellation flags

Revision ID: 011_cancelar_evento
Revises: 010_contas_participantes
Create Date: 2026-08-27

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "011_cancelar_evento"
down_revision: Union[str, None] = "010_contas_participantes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("ALTER TYPE curso_status ADD VALUE IF NOT EXISTS 'cancelled'"))
    op.add_column(
        "cursos",
        sa.Column("cancelamento_justificativa", sa.Text(), nullable=True),
    )
    op.add_column(
        "cursos",
        sa.Column("cancelado_em", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "inscricoes",
        sa.Column(
            "cancelada",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "inscricoes",
        sa.Column("cancelada_em", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "inscricoes",
        sa.Column("cancelada_justificativa", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.execute(sa.text("UPDATE cursos SET status = 'draft' WHERE status = 'cancelled'"))
    op.drop_column("inscricoes", "cancelada_justificativa")
    op.drop_column("inscricoes", "cancelada_em")
    op.drop_column("inscricoes", "cancelada")
    op.drop_column("cursos", "cancelado_em")
    op.drop_column("cursos", "cancelamento_justificativa")
