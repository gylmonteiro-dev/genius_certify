"""add rejected status to participante

Revision ID: 005_participante_reprovado
Revises: 004_participante
Create Date: 2026-08-23

"""

from typing import Sequence, Union

from alembic import op

revision: str = "005_participante_reprovado"
down_revision: Union[str, None] = "004_participante"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE aluno_status ADD VALUE IF NOT EXISTS 'rejected'")


def downgrade() -> None:
    # PostgreSQL não remove valor de ENUM com segurança; status rejected deixa de ser usado.
    pass
