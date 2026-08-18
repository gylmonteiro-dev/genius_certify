"""curso event fields: data, categoria, modalidade, tipo

Revision ID: 002_curso_event_fields
Revises: 001_initial_schema
Create Date: 2026-08-13

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002_curso_event_fields"
down_revision: Union[str, None] = "001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

curso_categoria = postgresql.ENUM(
    "technology",
    "business",
    "design",
    "data_science",
    name="curso_categoria",
    create_type=False,
)
curso_modalidade = postgresql.ENUM(
    "online",
    "presencial",
    name="curso_modalidade",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    curso_categoria.create(bind, checkfirst=True)
    curso_modalidade.create(bind, checkfirst=True)

    op.add_column("cursos", sa.Column("data_evento", sa.Date(), nullable=True))
    op.add_column("cursos", sa.Column("categoria", curso_categoria, nullable=True))
    op.add_column("cursos", sa.Column("modalidade", curso_modalidade, nullable=True))
    op.add_column(
        "cursos",
        sa.Column("tipo", sa.String(length=64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("cursos", "tipo")
    op.drop_column("cursos", "modalidade")
    op.drop_column("cursos", "categoria")
    op.drop_column("cursos", "data_evento")

    bind = op.get_bind()
    curso_modalidade.drop(bind, checkfirst=True)
    curso_categoria.drop(bind, checkfirst=True)
