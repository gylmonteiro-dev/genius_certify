"""instrutores e palestrantes estruturados

Revision ID: 018_curso_colaboradores
Revises: 017_curso_datas
Create Date: 2026-09-29

O campo ``cursos.instrutor`` permanece como texto de compatibilidade.
O conteúdo existente vira um único registro, sem divisão por vírgulas.
Certificados já emitidos ficam com ``colaboradores`` nulo e continuam
usando o texto legado.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "018_curso_colaboradores"
down_revision: Union[str, None] = "017_curso_datas"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

colaborador_funcao = postgresql.ENUM(
    "instrutor",
    "palestrante",
    "facilitador",
    "mediador",
    "outra",
    name="colaborador_funcao",
    create_type=False,
)
exibicao_colaboradores = postgresql.ENUM(
    "automatico",
    "somente_verso",
    "nao_exibir",
    name="exibicao_colaboradores",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    colaborador_funcao.create(bind, checkfirst=True)
    exibicao_colaboradores.create(bind, checkfirst=True)

    op.create_table(
        "curso_colaboradores",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("curso_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nome", sa.String(length=255), nullable=False),
        sa.Column("funcao", colaborador_funcao, nullable=False),
        sa.Column("funcao_personalizada", sa.String(length=80), nullable=True),
        sa.Column("tema_atividade", sa.String(length=180), nullable=True),
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
        sa.CheckConstraint(
            "length(btrim(nome)) > 0",
            name="ck_curso_colaboradores_nome_nao_vazio",
        ),
        sa.CheckConstraint(
            "ordem >= 0",
            name="ck_curso_colaboradores_ordem_nao_negativa",
        ),
        sa.CheckConstraint(
            "("
            "funcao <> 'outra' "
            "OR ("
            "funcao_personalizada IS NOT NULL "
            "AND length(btrim(funcao_personalizada)) > 0"
            ")"
            ")",
            name="ck_curso_colaboradores_funcao_personalizada",
        ),
        sa.ForeignKeyConstraint(
            ["curso_id"],
            ["cursos.id"],
            name="fk_curso_colaboradores_curso_id_cursos",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_curso_colaboradores"),
    )
    op.create_index(
        "ix_curso_colaboradores_curso_id",
        "curso_colaboradores",
        ["curso_id"],
    )

    op.create_table(
        "curso_colaborador_datas",
        sa.Column("colaborador_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("curso_data_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["colaborador_id"],
            ["curso_colaboradores.id"],
            name="fk_curso_colaborador_datas_colaborador_id_curso_colaboradores",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["curso_data_id"],
            ["curso_datas.id"],
            name="fk_curso_colaborador_datas_curso_data_id_curso_datas",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "colaborador_id",
            "curso_data_id",
            name="pk_curso_colaborador_datas",
        ),
    )
    op.create_index(
        "ix_curso_colaborador_datas_curso_data_id",
        "curso_colaborador_datas",
        ["curso_data_id"],
    )

    op.add_column(
        "cursos",
        sa.Column(
            "exibicao_colaboradores",
            exibicao_colaboradores,
            nullable=False,
            server_default="automatico",
        ),
    )
    op.add_column(
        "certificados",
        sa.Column("colaboradores", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "certificados",
        sa.Column("exibicao_colaboradores", sa.String(length=32), nullable=True),
    )

    # Copia o texto inteiro. Vírgulas podem separar nomes, títulos ou funções.
    op.execute(
        """
        INSERT INTO curso_colaboradores (
            id,
            curso_id,
            nome,
            funcao,
            funcao_personalizada,
            tema_atividade,
            ordem,
            created_at,
            updated_at
        )
        SELECT
            gen_random_uuid(),
            id,
            instrutor,
            'instrutor'::colaborador_funcao,
            NULL,
            NULL,
            0,
            now(),
            now()
        FROM cursos
        WHERE instrutor IS NOT NULL
          AND btrim(instrutor) <> ''
        """
    )


def downgrade() -> None:
    op.drop_column("certificados", "exibicao_colaboradores")
    op.drop_column("certificados", "colaboradores")
    op.drop_column("cursos", "exibicao_colaboradores")
    op.drop_index(
        "ix_curso_colaborador_datas_curso_data_id",
        table_name="curso_colaborador_datas",
    )
    op.drop_table("curso_colaborador_datas")
    op.drop_index("ix_curso_colaboradores_curso_id", table_name="curso_colaboradores")
    op.drop_table("curso_colaboradores")
    postgresql.ENUM(name="exibicao_colaboradores").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="colaborador_funcao").drop(op.get_bind(), checkfirst=True)
