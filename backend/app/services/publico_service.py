from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.models.curso import Curso, CursoStatus
from app.repositories.curso_repository import CursoRepository
from app.repositories.inscricao_repository import InscricaoRepository
from app.repositories.participante_repository import ParticipanteRepository
from app.schemas.curso import CursoPublicResponse, InscricaoPublicaRequest
from app.schemas.participante import ParticipanteResponse
from app.services.participante_service import resolve_or_create_participante


class PublicoService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._cursos = CursoRepository(session)
        self._participantes = ParticipanteRepository(session)
        self._inscricoes = InscricaoRepository(session)

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
    ) -> ParticipanteResponse:
        curso = await self._cursos.get_publico(curso_id)
        if curso is None or curso.status != CursoStatus.UPCOMING:
            raise NotFoundError("Curso não encontrado ou inscrições encerradas")

        email = str(data.email).lower()
        participante, _created = await resolve_or_create_participante(
            self._participantes,
            instituicao_id=curso.instituicao_id,
            nome=data.nome.strip(),
            email=email,
            documento=data.documento,
        )

        existing = await self._inscricoes.get_by_participante_curso(
            instituicao_id=curso.instituicao_id,
            participante_id=participante.id,
            curso_id=curso.id,
        )
        if existing is not None:
            raise ConflictError("Já inscrito neste evento")

        await self._inscricoes.create(
            instituicao_id=curso.instituicao_id,
            participante_id=participante.id,
            curso_id=curso.id,
        )
        await self._session.commit()
        await self._session.refresh(participante)
        return ParticipanteResponse.model_validate(participante)
