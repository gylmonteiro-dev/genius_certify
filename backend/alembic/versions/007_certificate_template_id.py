"""add template_id to cursos and certificados

Revision ID: 007_certificate_template_id
Revises: 006_participante_data_nascimento
Create Date: 2026-08-23

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "007_certificate_template_id"
down_revision: Union[str, None] = "006_participante_data_nascimento"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "cursos",
        sa.Column(
            "template_id",
            sa.String(length=64),
            nullable=False,
            server_default="classic",
        ),
    )
    op.add_column(
        "certificados",
        sa.Column(
            "template_id",
            sa.String(length=64),
            nullable=False,
            server_default="classic",
        ),
    )


def downgrade() -> None:
    op.drop_column("certificados", "template_id")
    op.drop_column("cursos", "template_id")
