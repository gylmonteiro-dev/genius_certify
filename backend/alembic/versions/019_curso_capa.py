"""capa opcional do evento

Revision ID: 019_curso_capa
Revises: 018_curso_colaboradores
Create Date: 2026-09-29

Eventos existentes ficam com as colunas nulas e usam a capa padrão.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "019_curso_capa"
down_revision: Union[str, None] = "018_curso_colaboradores"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("cursos", sa.Column("capa_card_url", sa.String(length=512), nullable=True))
    op.add_column("cursos", sa.Column("capa_detail_url", sa.String(length=512), nullable=True))
    op.add_column("cursos", sa.Column("capa_foco_x", sa.Float(), nullable=True))
    op.add_column("cursos", sa.Column("capa_foco_y", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("cursos", "capa_foco_y")
    op.drop_column("cursos", "capa_foco_x")
    op.drop_column("cursos", "capa_detail_url")
    op.drop_column("cursos", "capa_card_url")
