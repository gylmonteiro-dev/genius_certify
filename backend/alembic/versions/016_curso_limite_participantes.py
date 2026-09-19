"""optional participant capacity on events

Revision ID: 016_curso_limite_participantes
Revises: 015_inscricao_reprovada
Create Date: 2026-09-19

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "016_curso_limite_participantes"
down_revision: Union[str, None] = "015_inscricao_reprovada"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "cursos",
        sa.Column("limite_participantes", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("cursos", "limite_participantes")
