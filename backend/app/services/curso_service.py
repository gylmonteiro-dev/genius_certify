from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError, ConflictError, ForbiddenError, NotFoundError
from app.models.curso import Curso
from app.models.usuario import Usuario, UsuarioRole
from app.repositories.curso_repository import CursoRepository
from app.repositories.instituicao_repository import InstituicaoRepository
from app.schemas.curso import CursoCreate, CursoResponse, CursoUpdate


class CursoService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._cursos = CursoRepository(session)
        self._instituicoes = InstituicaoRepository(session)

    def _tenant_id_for_queries(self, actor: Usuario) -> UUID | None:
        """Admin da instituição: sempre filtra pelo tenant. SuperAdmin: sem filtro."""
        if actor.role == UsuarioRole.SUPER_ADMIN:
            return None
        if actor.instituicao_id is None:
            raise ForbiddenError("Usuário sem instituição vinculada")
        return actor.instituicao_id

    def _resolve_instituicao_id_for_create(
        self,
        actor: Usuario,
        body_instituicao_id: UUID | None,
    ) -> UUID:
        if actor.role == UsuarioRole.SUPER_ADMIN:
            if body_instituicao_id is None:
                raise AppError("SuperAdmin deve informar instituicao_id")
            return body_instituicao_id

        if actor.instituicao_id is None:
            raise ForbiddenError("Usuário sem instituição vinculada")

        if body_instituicao_id is not None and body_instituicao_id != actor.instituicao_id:
            raise ForbiddenError("Não é permitido criar curso em outro tenant")

        return actor.instituicao_id

    async def create(self, data: CursoCreate, *, actor: Usuario) -> CursoResponse:
        instituicao_id = self._resolve_instituicao_id_for_create(actor, data.instituicao_id)

        instituicao = await self._instituicoes.get_by_id(instituicao_id)
        if instituicao is None:
            raise NotFoundError("Instituição não encontrada")

        curso = await self._cursos.create(
            instituicao_id=instituicao_id,
            titulo=data.titulo.strip(),
            descricao=data.descricao,
            carga_horaria=data.carga_horaria,
            instrutor=data.instrutor.strip(),
            status=data.status,
        )
        await self._session.commit()
        await self._session.refresh(curso)
        return CursoResponse.model_validate(curso)

    async def list(
        self,
        *,
        actor: Usuario,
        instituicao_id: UUID | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[CursoResponse]:
        tenant = self._tenant_id_for_queries(actor)

        if actor.role == UsuarioRole.SUPER_ADMIN:
            filter_id = instituicao_id
        else:
            # Admin nunca pode listar outro tenant
            if instituicao_id is not None and instituicao_id != tenant:
                raise ForbiddenError("Não é permitido listar cursos de outro tenant")
            filter_id = tenant

        items = await self._cursos.list(
            instituicao_id=filter_id,
            skip=skip,
            limit=limit,
        )
        return [CursoResponse.model_validate(item) for item in items]

    async def get(self, curso_id: UUID, *, actor: Usuario) -> CursoResponse:
        curso = await self._get_or_404(curso_id, actor=actor)
        return CursoResponse.model_validate(curso)

    async def update(
        self,
        curso_id: UUID,
        data: CursoUpdate,
        *,
        actor: Usuario,
    ) -> CursoResponse:
        curso = await self._get_or_404(curso_id, actor=actor)
        payload = data.model_dump(exclude_unset=True)

        if "titulo" in payload and payload["titulo"] is not None:
            payload["titulo"] = payload["titulo"].strip()
        if "instrutor" in payload and payload["instrutor"] is not None:
            payload["instrutor"] = payload["instrutor"].strip()

        for field, value in payload.items():
            setattr(curso, field, value)

        await self._cursos.save(curso)
        await self._session.commit()
        await self._session.refresh(curso)
        return CursoResponse.model_validate(curso)

    async def delete(self, curso_id: UUID, *, actor: Usuario) -> None:
        curso = await self._get_or_404(curso_id, actor=actor)
        certificados = await self._cursos.count_certificados(curso.id)
        if certificados > 0:
            raise ConflictError(
                "Curso possui certificados emitidos e não pode ser excluído"
            )

        await self._cursos.delete(curso)
        await self._session.commit()

    async def _get_or_404(self, curso_id: UUID, *, actor: Usuario) -> Curso:
        tenant = self._tenant_id_for_queries(actor)
        curso = await self._cursos.get_by_id(curso_id, instituicao_id=tenant)
        if curso is None:
            raise NotFoundError("Curso não encontrado")
        return curso
