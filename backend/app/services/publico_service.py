from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.models.aluno import AlunoStatus
from app.models.curso import Curso, CursoStatus
from app.repositories.aluno_repository import AlunoRepository
from app.repositories.curso_repository import CursoRepository
from app.schemas.aluno import AlunoResponse
from app.schemas.curso import CursoPublicResponse, InscricaoPublicaRequest


class PublicoService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._cursos = CursoRepository(session)
        self._alunos = AlunoRepository(session)

    @staticmethod
    def to_curso_public(curso: Curso) -> CursoPublicResponse:
        instituicao_nome = (
            curso.instituicao.nome if curso.instituicao is not None else ""
        )
        return CursoPublicResponse(
            id=curso.id,
            titulo=curso.titulo,
            descricao=curso.descricao,
            carga_horaria=curso.carga_horaria,
            instrutor=curso.instrutor,
            status=curso.status,
            instituicao_nome=instituicao_nome,
            data_evento=curso.data_evento,
            categoria=curso.categoria,
            modalidade=curso.modalidade,
            tipo=curso.tipo,
        )

    async def list_cursos(
        self,
        *,
        skip: int = 0,
        limit: int = 50,
    ) -> list[CursoPublicResponse]:
        items = await self._cursos.list_publico(skip=skip, limit=limit)
        return [self.to_curso_public(item) for item in items]

    async def get_curso(self, curso_id: UUID) -> CursoPublicResponse:
        curso = await self._cursos.get_publico(curso_id)
        if curso is None:
            raise NotFoundError("Curso não encontrado")
        return self.to_curso_public(curso)

    async def inscrever(
        self,
        curso_id: UUID,
        data: InscricaoPublicaRequest,
    ) -> AlunoResponse:
        curso = await self._cursos.get_publico(curso_id)
        if curso is None or curso.status != CursoStatus.UPCOMING:
            raise NotFoundError("Curso não encontrado ou inscrições encerradas")

        email = str(data.email).lower()
        conflict = await self._alunos.find_conflict(
            instituicao_id=curso.instituicao_id,
            email=email,
            documento=data.documento,
        )
        if conflict is not None:
            raise ConflictError("E-mail ou documento já cadastrado nesta instituição")

        aluno = await self._alunos.create(
            instituicao_id=curso.instituicao_id,
            nome=data.nome.strip(),
            email=email,
            documento=data.documento,
            status=AlunoStatus.PENDING,
        )
        await self._session.commit()
        await self._session.refresh(aluno)
        return AlunoResponse.model_validate(aluno)
