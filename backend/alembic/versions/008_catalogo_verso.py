"""catalogo global de eventos + verso do certificado

Revision ID: 008_catalogo_verso
Revises: 007_certificate_template_id
Create Date: 2026-08-23

"""

from typing import Sequence, Union
from uuid import uuid4

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "008_catalogo_verso"
down_revision: Union[str, None] = "007_certificate_template_id"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

catalogo_evento_kind = postgresql.ENUM(
    "categoria",
    "modalidade",
    "tipo",
    name="catalogo_evento_kind",
    create_type=False,
)

SEED_ITEMS: list[tuple[str, str, str, str, int]] = [
    ("categoria", "technology", "Tecnologia", "Technology", 10),
    ("categoria", "business", "Negócios", "Business", 20),
    ("categoria", "design", "Design", "Design", 30),
    ("categoria", "data_science", "Ciência de dados", "Data Science", 40),
    ("modalidade", "online", "Online", "Online", 10),
    ("modalidade", "presencial", "Presencial", "In-Person", 20),
    ("tipo", "workshop", "Workshop", "Workshop", 10),
    ("tipo", "seminar", "Seminário", "Seminar", 20),
    ("tipo", "exam_prep", "Preparatório", "Exam Prep", 30),
    ("tipo", "summit", "Summit", "Summit", 40),
    ("tipo", "conference", "Conferência", "Conference", 50),
]


def upgrade() -> None:
    bind = op.get_bind()
    catalogo_evento_kind.create(bind, checkfirst=True)

    op.create_table(
        "catalogo_evento_itens",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("kind", catalogo_evento_kind, nullable=False),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("nome", sa.String(length=128), nullable=False),
        sa.Column("nome_en", sa.String(length=128), nullable=False, server_default=""),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("ordem", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name="pk_catalogo_evento_itens"),
        sa.UniqueConstraint(
            "kind",
            "slug",
            name="uq_catalogo_evento_itens_kind_slug",
        ),
    )
    op.create_index(
        "ix_catalogo_evento_itens_kind",
        "catalogo_evento_itens",
        ["kind"],
    )

    itens = sa.table(
        "catalogo_evento_itens",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("kind", catalogo_evento_kind),
        sa.column("slug", sa.String),
        sa.column("nome", sa.String),
        sa.column("nome_en", sa.String),
        sa.column("ativo", sa.Boolean),
        sa.column("ordem", sa.Integer),
    )
    op.execute(
        itens.insert().values(
            [
                {
                    "id": uuid4(),
                    "kind": kind,
                    "slug": slug,
                    "nome": nome,
                    "nome_en": nome_en,
                    "ativo": True,
                    "ordem": ordem,
                }
                for kind, slug, nome, nome_en, ordem in SEED_ITEMS
            ]
        )
    )

    op.execute(
        "ALTER TABLE cursos ALTER COLUMN categoria TYPE VARCHAR(64) USING categoria::text"
    )
    op.execute(
        "ALTER TABLE cursos ALTER COLUMN modalidade TYPE VARCHAR(64) USING modalidade::text"
    )
    op.execute("DROP TYPE IF EXISTS curso_categoria")
    op.execute("DROP TYPE IF EXISTS curso_modalidade")

    op.add_column("cursos", sa.Column("verso_parcerias", sa.Text(), nullable=True))
    op.add_column("cursos", sa.Column("verso_conteudos", sa.Text(), nullable=True))
    op.add_column("cursos", sa.Column("verso_observacoes", sa.Text(), nullable=True))
    op.add_column("certificados", sa.Column("verso_parcerias", sa.Text(), nullable=True))
    op.add_column("certificados", sa.Column("verso_conteudos", sa.Text(), nullable=True))
    op.add_column(
        "certificados",
        sa.Column("verso_observacoes", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("certificados", "verso_observacoes")
    op.drop_column("certificados", "verso_conteudos")
    op.drop_column("certificados", "verso_parcerias")
    op.drop_column("cursos", "verso_observacoes")
    op.drop_column("cursos", "verso_conteudos")
    op.drop_column("cursos", "verso_parcerias")

    bind = op.get_bind()
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
    curso_categoria.create(bind, checkfirst=True)
    curso_modalidade.create(bind, checkfirst=True)

    op.execute(
        "ALTER TABLE cursos ALTER COLUMN categoria TYPE curso_categoria"
        " USING categoria::curso_categoria"
    )
    op.execute(
        "ALTER TABLE cursos ALTER COLUMN modalidade TYPE curso_modalidade"
        " USING modalidade::curso_modalidade"
    )

    op.drop_index("ix_catalogo_evento_itens_kind", table_name="catalogo_evento_itens")
    op.drop_table("catalogo_evento_itens")
    catalogo_evento_kind.drop(bind, checkfirst=True)
