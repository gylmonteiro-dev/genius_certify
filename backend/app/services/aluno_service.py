from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError, ConflictError, ForbiddenError, NotFoundError
from app.models.aluno import Aluno
from app.models.usuario import Usuario, UsuarioRole
from app.repositories.aluno_repository import AlunoRepository
from app.repositories.instituicao_repository import InstituicaoRepository
from app.schemas.aluno import AlunoCreate, AlunoResponse, AlunoUpdate


class AlunoService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._alunos = AlunoRepository(session)
        self._instituicoes = InstituicaoRepository(session)

    def _tenant_id_for_queries(self, actor: Usuario) -> UUID | None:
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
            raise ForbiddenError("Não é permitido criar aluno em outro tenant")

        return actor.instituicao_id

    async def create(self, data: AlunoCreate, *, actor: Usuario) -> AlunoResponse:
        instituicao_id = self._resolve_instituicao_id_for_create(actor, data.instituicao_id)

        instituicao = await self._instituicoes.get_by_id(instituicao_id)
        if instituicao is None:
            raise NotFoundError("Instituição não encontrada")

        email = str(data.email).lower()
        conflict = await self._alunos.find_conflict(
            instituicao_id=instituicao_id,
            email=email,
            documento=data.documento,
        )
        if conflict is not None:
            raise ConflictError("E-mail ou documento já cadastrado nesta instituição")

        aluno = await self._alunos.create(
            instituicao_id=instituicao_id,
            nome=data.nome.strip(),
            email=email,
            documento=data.documento,
            status=data.status,
        )
        await self._session.commit()
        await self._session.refresh(aluno)
        return AlunoResponse.model_validate(aluno)

    async def list(
        self,
        *,
        actor: Usuario,
        instituicao_id: UUID | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[AlunoResponse]:
        tenant = self._tenant_id_for_queries(actor)

        if actor.role == UsuarioRole.SUPER_ADMIN:
            filter_id = instituicao_id
        else:
            if instituicao_id is not None and instituicao_id != tenant:
                raise ForbiddenError("Não é permitido listar alunos de outro tenant")
            filter_id = tenant

        items = await self._alunos.list(
            instituicao_id=filter_id,
            skip=skip,
            limit=limit,
        )
        return [AlunoResponse.model_validate(item) for item in items]

    async def get(self, aluno_id: UUID, *, actor: Usuario) -> AlunoResponse:
        aluno = await self._get_or_404(aluno_id, actor=actor)
        return AlunoResponse.model_validate(aluno)

    async def update(
        self,
        aluno_id: UUID,
        data: AlunoUpdate,
        *,
        actor: Usuario,
    ) -> AlunoResponse:
        aluno = await self._get_or_404(aluno_id, actor=actor)
        payload = data.model_dump(exclude_unset=True)

        if "nome" in payload and payload["nome"] is not None:
            payload["nome"] = payload["nome"].strip()
        if "email" in payload and payload["email"] is not None:
            payload["email"] = str(payload["email"]).lower()

        novo_email = payload.get("email", aluno.email)
        novo_documento = payload.get("documento", aluno.documento)
        if "email" in payload or "documento" in payload:
            conflict = await self._alunos.find_conflict(
                instituicao_id=aluno.instituicao_id,
                email=novo_email,
                documento=novo_documento,
                exclude_id=aluno.id,
            )
            if conflict is not None:
                raise ConflictError("E-mail ou documento já cadastrado nesta instituição")

        for field, value in payload.items():
            setattr(aluno, field, value)

        await self._alunos.save(aluno)
        await self._session.commit()
        await self._session.refresh(aluno)
        return AlunoResponse.model_validate(aluno)

    async def delete(self, aluno_id: UUID, *, actor: Usuario) -> None:
        aluno = await self._get_or_404(aluno_id, actor=actor)
        certificados = await self._alunos.count_certificados(aluno.id)
        if certificados > 0:
            raise ConflictError(
                "Aluno possui certificados emitidos e não pode ser excluído"
            )

        await self._alunos.delete(aluno)
        await self._session.commit()

    async def _get_or_404(self, aluno_id: UUID, *, actor: Usuario) -> Aluno:
        tenant = self._tenant_id_for_queries(actor)
        aluno = await self._alunos.get_by_id(aluno_id, instituicao_id=tenant)
        if aluno is None:
            raise NotFoundError("Aluno não encontrado")
        return aluno
