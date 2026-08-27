"""editable certificate front title and attestation copy

Revision ID: 012_frente_certificado
Revises: 011_cancelar_evento
Create Date: 2026-08-27

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "012_frente_certificado"
down_revision: Union[str, None] = "011_cancelar_evento"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "cursos",
        sa.Column("frente_tipo", sa.String(length=32), nullable=False, server_default="conclusao"),
    )
    op.add_column(
        "cursos",
        sa.Column("frente_titulo", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "cursos",
        sa.Column("frente_atestacao", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "certificados",
        sa.Column("frente_tipo", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "certificados",
        sa.Column("frente_titulo", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "certificados",
        sa.Column("frente_atestacao", sa.String(length=255), nullable=True),
    )
    op.alter_column("cursos", "frente_tipo", server_default=None)


def downgrade() -> None:
    op.drop_column("certificados", "frente_atestacao")
    op.drop_column("certificados", "frente_titulo")
    op.drop_column("certificados", "frente_tipo")
    op.drop_column("cursos", "frente_atestacao")
    op.drop_column("cursos", "frente_titulo")
    op.drop_column("cursos", "frente_tipo")
