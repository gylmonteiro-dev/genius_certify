from uuid import UUID

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError, ConflictError, ForbiddenError, NotFoundError
from app.core.security import hash_password
from app.models.instituicao import Instituicao
from app.models.usuario import Usuario, UsuarioRole
from app.repositories.instituicao_repository import InstituicaoRepository
from app.repositories.usuario_repository import UsuarioRepository
from app.schemas.instituicao import (
    InstituicaoCreate,
    InstituicaoResponse,
    InstituicaoUpdate,
)
from app.services.storage_service import StorageService, get_storage_service

ALLOWED_IMAGE_TYPES = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
}
MAX_ASSET_BYTES = 2 * 1024 * 1024  # 2 MB
ALLOWED_ASSET_TYPES = {"logo", "assinatura"}


class InstituicaoService:
    def __init__(
        self,
        session: AsyncSession,
        storage: StorageService | None = None,
    ) -> None:
        self._session = session
        self._instituicoes = InstituicaoRepository(session)
        self._usuarios = UsuarioRepository(session)
        self._storage = storage

    @staticmethod
    def _assert_access(user: Usuario, instituicao_id: UUID) -> None:
        if user.role == UsuarioRole.SUPER_ADMIN:
            return
        if user.instituicao_id != instituicao_id:
            raise ForbiddenError("Instituição fora do seu tenant")

    async def create(self, data: InstituicaoCreate, *, actor: Usuario) -> InstituicaoResponse:
        if actor.role != UsuarioRole.SUPER_ADMIN:
            raise ForbiddenError("Apenas SuperAdmin pode criar instituições")

        conflict = await self._instituicoes.exists_codigo_or_cnpj(
            codigo=data.codigo,
            cnpj=data.cnpj,
        )
        if conflict is not None:
            raise ConflictError("Código ou CNPJ já cadastrado")

        wants_admin = any([data.admin_nome, data.admin_email, data.admin_password])
        if wants_admin and not all([data.admin_nome, data.admin_email, data.admin_password]):
            raise AppError(
                "Para criar admin da instituição informe admin_nome, admin_email e admin_password"
            )

        if data.admin_email:
            existing_user = await self._usuarios.get_by_email(str(data.admin_email))
            if existing_user is not None:
                raise ConflictError("E-mail do admin já está em uso")

        instituicao = await self._instituicoes.create(
            nome=data.nome,
            codigo=data.codigo,
            cnpj=data.cnpj,
            endereco=data.endereco,
            responsavel=data.responsavel,
            email=str(data.email).lower(),
            telefone=data.telefone,
            status=data.status,
        )

        if data.admin_email and data.admin_nome and data.admin_password:
            await self._usuarios.create(
                nome=data.admin_nome,
                email=str(data.admin_email),
                hashed_password=hash_password(data.admin_password),
                role=UsuarioRole.INSTITUICAO_ADMIN,
                instituicao_id=instituicao.id,
            )

        await self._session.commit()
        await self._session.refresh(instituicao)
        return InstituicaoResponse.model_validate(instituicao)

    async def list(
        self,
        *,
        actor: Usuario,
        skip: int = 0,
        limit: int = 50,
    ) -> list[InstituicaoResponse]:
        instituicao_id: UUID | None = None
        if actor.role != UsuarioRole.SUPER_ADMIN:
            if actor.instituicao_id is None:
                return []
            instituicao_id = actor.instituicao_id

        items = await self._instituicoes.list(
            instituicao_id=instituicao_id,
            skip=skip,
            limit=limit,
        )
        return [InstituicaoResponse.model_validate(item) for item in items]

    async def get(self, instituicao_id: UUID, *, actor: Usuario) -> InstituicaoResponse:
        self._assert_access(actor, instituicao_id)
        instituicao = await self._get_or_404(instituicao_id)
        return InstituicaoResponse.model_validate(instituicao)

    async def update(
        self,
        instituicao_id: UUID,
        data: InstituicaoUpdate,
        *,
        actor: Usuario,
    ) -> InstituicaoResponse:
        self._assert_access(actor, instituicao_id)
        instituicao = await self._get_or_404(instituicao_id)

        payload = data.model_dump(exclude_unset=True)

        # Apenas SuperAdmin altera status
        if "status" in payload and actor.role != UsuarioRole.SUPER_ADMIN:
            raise ForbiddenError("Apenas SuperAdmin pode alterar status")

        novo_codigo = payload.get("codigo", instituicao.codigo)
        novo_cnpj = payload.get("cnpj", instituicao.cnpj)
        if "codigo" in payload or "cnpj" in payload:
            conflict = await self._instituicoes.exists_codigo_or_cnpj(
                codigo=novo_codigo,
                cnpj=novo_cnpj,
                exclude_id=instituicao.id,
            )
            if conflict is not None:
                raise ConflictError("Código ou CNPJ já cadastrado")

        if "email" in payload and payload["email"] is not None:
            payload["email"] = str(payload["email"]).lower()

        for field, value in payload.items():
            setattr(instituicao, field, value)

        await self._instituicoes.save(instituicao)
        await self._session.commit()
        await self._session.refresh(instituicao)
        return InstituicaoResponse.model_validate(instituicao)

    async def delete(self, instituicao_id: UUID, *, actor: Usuario) -> InstituicaoResponse:
        if actor.role != UsuarioRole.SUPER_ADMIN:
            raise ForbiddenError("Apenas SuperAdmin pode suspender instituições")

        instituicao = await self._get_or_404(instituicao_id)
        await self._instituicoes.soft_delete(instituicao)
        await self._session.commit()
        await self._session.refresh(instituicao)
        return InstituicaoResponse.model_validate(instituicao)

    async def upload_asset(
        self,
        instituicao_id: UUID,
        *,
        actor: Usuario,
        asset_type: str,
        file: UploadFile,
    ) -> InstituicaoResponse:
        if asset_type not in ALLOWED_ASSET_TYPES:
            raise AppError("Tipo de asset inválido. Use logo ou assinatura")

        self._assert_access(actor, instituicao_id)
        instituicao = await self._get_or_404(instituicao_id)

        content_type = (file.content_type or "").lower()
        extension = ALLOWED_IMAGE_TYPES.get(content_type)
        if extension is None:
            raise AppError("Formato inválido. Use PNG, JPEG ou WebP")

        data = await file.read()
        if not data:
            raise AppError("Arquivo vazio")
        if len(data) > MAX_ASSET_BYTES:
            raise AppError("Arquivo excede o limite de 2 MB")

        storage = self._storage or get_storage_service()
        key = storage.build_instituicao_asset_key(instituicao_id, asset_type, extension)
        url = storage.upload_bytes(data=data, key=key, content_type=content_type)

        if asset_type == "logo":
            instituicao.logo_url = url
        else:
            instituicao.assinatura_url = url

        await self._instituicoes.save(instituicao)
        await self._session.commit()
        await self._session.refresh(instituicao)
        return InstituicaoResponse.model_validate(instituicao)

    async def _get_or_404(self, instituicao_id: UUID) -> Instituicao:
        instituicao = await self._instituicoes.get_by_id(instituicao_id)
        if instituicao is None:
            raise NotFoundError("Instituição não encontrada")
        return instituicao
