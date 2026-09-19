from uuid import UUID

from app.core.exceptions import ConflictError, NotFoundError
from app.models.curso import Curso
from app.repositories.curso_repository import CursoRepository
from app.repositories.inscricao_repository import InscricaoRepository

VAGAS_ESGOTADAS = "Vagas esgotadas para este evento"


def vagas_disponiveis(limite: int | None, ocupadas: int) -> int | None:
    if limite is None:
        return None
    return max(0, limite - ocupadas)


def assert_vaga_disponivel(curso: Curso, ocupadas: int) -> None:
    if curso.limite_participantes is None:
        return
    if ocupadas >= curso.limite_participantes:
        raise ConflictError(VAGAS_ESGOTADAS)


async def lock_and_assert_vaga(
    cursos: CursoRepository,
    inscricoes: InscricaoRepository,
    curso_id: UUID,
    *,
    instituicao_id: UUID | None = None,
) -> Curso:
    locked = await cursos.get_by_id_for_update(
        curso_id,
        instituicao_id=instituicao_id,
    )
    if locked is None:
        raise NotFoundError("Curso não encontrado")
    ocupadas = await inscricoes.count_ativas_by_curso(
        instituicao_id=locked.instituicao_id,
        curso_id=locked.id,
    )
    assert_vaga_disponivel(locked, ocupadas)
    return locked
