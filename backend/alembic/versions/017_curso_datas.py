"""event dates collection and certificate date snapshot

Revision ID: 017_curso_datas
Revises: 016_curso_limite_participantes
Create Date: 2026-09-29

``cursos.data_evento`` permanece como alias da primeira data ordenada.
A remoção definitiva fica para uma migration posterior.

O snapshot ``certificados.datas_evento`` é um array de DATE. Certificados
já emitidos recebem a data que existia no evento no momento desta migration.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "017_curso_datas"
down_revision: Union[str, None] = "016_curso_limite_participantes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "curso_datas",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("curso_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("data", sa.Date(), nullable=False),
        sa.ForeignKeyConstraint(
            ["curso_id"],
            ["cursos.id"],
            name="fk_curso_datas_curso_id_cursos",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_curso_datas"),
        sa.UniqueConstraint(
            "curso_id",
            "data",
            name="uq_curso_datas_curso_id_data",
        ),
    )
    # A unique (curso_id, data) já indexa a coleção de um evento.
    # Este índice cobre ordenação e filtro só pela data.
    op.create_index("ix_curso_datas_data", "curso_datas", ["data"])

    op.execute(
        """
        INSERT INTO curso_datas (id, curso_id, data)
        SELECT gen_random_uuid(), id, data_evento
        FROM cursos
        WHERE data_evento IS NOT NULL
        """
    )

    op.add_column(
        "certificados",
        sa.Column(
            "datas_evento",
            postgresql.ARRAY(sa.Date()),
            nullable=False,
            server_default=sa.text("'{}'::date[]"),
        ),
    )
    op.execute(
        """
        UPDATE certificados AS certificado
        SET datas_evento = ARRAY[curso.data_evento]::date[]
        FROM cursos AS curso
        WHERE certificado.curso_id = curso.id
          AND curso.data_evento IS NOT NULL
        """
    )


def downgrade() -> None:
    op.drop_column("certificados", "datas_evento")
    op.drop_index("ix_curso_datas_data", table_name="curso_datas")
    op.drop_table("curso_datas")
