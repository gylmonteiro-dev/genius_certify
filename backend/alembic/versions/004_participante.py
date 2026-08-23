"""rename aluno to participante

Revision ID: 004_participante
Revises: 003_inscricoes
Create Date: 2026-08-23

"""

from typing import Sequence, Union

from alembic import op

revision: str = "004_participante"
down_revision: Union[str, None] = "003_inscricoes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint(
        "fk_certificados_aluno_id_alunos",
        "certificados",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_inscricoes_aluno_id_alunos",
        "inscricoes",
        type_="foreignkey",
    )
    op.drop_constraint("uq_inscricoes_aluno_curso", "inscricoes", type_="unique")

    op.rename_table("alunos", "participantes")
    op.execute("ALTER INDEX ix_alunos_instituicao_id RENAME TO ix_participantes_instituicao_id")
    op.execute("ALTER TABLE participantes RENAME CONSTRAINT pk_alunos TO pk_participantes")
    op.execute(
        "ALTER TABLE participantes RENAME CONSTRAINT "
        "uq_alunos_instituicao_email TO uq_participantes_instituicao_email"
    )
    op.execute(
        "ALTER TABLE participantes RENAME CONSTRAINT "
        "uq_alunos_instituicao_documento TO uq_participantes_instituicao_documento"
    )
    op.execute(
        "ALTER TABLE participantes RENAME CONSTRAINT "
        "fk_alunos_instituicao_id_instituicoes TO fk_participantes_instituicao_id_instituicoes"
    )

    op.alter_column("certificados", "aluno_id", new_column_name="participante_id")
    op.alter_column("certificados", "aluno_nome", new_column_name="participante_nome")
    op.execute(
        "ALTER INDEX ix_certificados_aluno_id RENAME TO ix_certificados_participante_id"
    )
    op.create_foreign_key(
        "fk_certificados_participante_id_participantes",
        "certificados",
        "participantes",
        ["participante_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.alter_column("inscricoes", "aluno_id", new_column_name="participante_id")
    op.execute("ALTER INDEX ix_inscricoes_aluno_id RENAME TO ix_inscricoes_participante_id")
    op.create_unique_constraint(
        "uq_inscricoes_participante_curso",
        "inscricoes",
        ["participante_id", "curso_id"],
    )
    op.create_foreign_key(
        "fk_inscricoes_participante_id_participantes",
        "inscricoes",
        "participantes",
        ["participante_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_inscricoes_participante_id_participantes",
        "inscricoes",
        type_="foreignkey",
    )
    op.drop_constraint(
        "uq_inscricoes_participante_curso",
        "inscricoes",
        type_="unique",
    )
    op.execute("ALTER INDEX ix_inscricoes_participante_id RENAME TO ix_inscricoes_aluno_id")
    op.alter_column("inscricoes", "participante_id", new_column_name="aluno_id")

    op.drop_constraint(
        "fk_certificados_participante_id_participantes",
        "certificados",
        type_="foreignkey",
    )
    op.execute(
        "ALTER INDEX ix_certificados_participante_id RENAME TO ix_certificados_aluno_id"
    )
    op.alter_column("certificados", "participante_nome", new_column_name="aluno_nome")
    op.alter_column("certificados", "participante_id", new_column_name="aluno_id")

    op.execute(
        "ALTER TABLE participantes RENAME CONSTRAINT "
        "fk_participantes_instituicao_id_instituicoes TO fk_alunos_instituicao_id_instituicoes"
    )
    op.execute(
        "ALTER TABLE participantes RENAME CONSTRAINT "
        "uq_participantes_instituicao_documento TO uq_alunos_instituicao_documento"
    )
    op.execute(
        "ALTER TABLE participantes RENAME CONSTRAINT "
        "uq_participantes_instituicao_email TO uq_alunos_instituicao_email"
    )
    op.execute("ALTER TABLE participantes RENAME CONSTRAINT pk_participantes TO pk_alunos")
    op.execute("ALTER INDEX ix_participantes_instituicao_id RENAME TO ix_alunos_instituicao_id")
    op.rename_table("participantes", "alunos")

    op.create_unique_constraint(
        "uq_inscricoes_aluno_curso",
        "inscricoes",
        ["aluno_id", "curso_id"],
    )
    op.create_foreign_key(
        "fk_inscricoes_aluno_id_alunos",
        "inscricoes",
        "alunos",
        ["aluno_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_certificados_aluno_id_alunos",
        "certificados",
        "alunos",
        ["aluno_id"],
        ["id"],
        ondelete="RESTRICT",
    )
