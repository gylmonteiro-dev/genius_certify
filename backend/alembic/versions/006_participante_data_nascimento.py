"""add data_nascimento to participantes

Revision ID: 006_participante_data_nascimento
Revises: 005_participante_reprovado
Create Date: 2026-08-23

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006_participante_data_nascimento"
down_revision: Union[str, None] = "005_participante_reprovado"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "participantes",
        sa.Column("data_nascimento", sa.Date(), nullable=True),
    )
    op.create_index(
        "ix_participantes_documento_data_nascimento",
        "participantes",
        ["documento", "data_nascimento"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_participantes_documento_data_nascimento",
        table_name="participantes",
    )
    op.drop_column("participantes", "data_nascimento")
