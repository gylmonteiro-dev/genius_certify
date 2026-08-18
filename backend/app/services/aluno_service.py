from __future__ import annotations

import csv
import io
from uuid import UUID

from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError, ConflictError, ForbiddenError, NotFoundError
from app.models.aluno import Aluno, AlunoStatus
from app.models.usuario import Usuario, UsuarioRole
from app.repositories.aluno_repository import AlunoRepository
from app.repositories.instituicao_repository import InstituicaoRepository
from app.schemas.aluno import (
    AlunoCreate,
    AlunoImportError,
    AlunoImportResponse,
    AlunoResponse,
    AlunoUpdate,
)

_MAX_CSV_BYTES = 2 * 1024 * 1024
_MAX_CSV_ROWS = 500


def _first_validation_message(exc: Exception) -> str:
    if isinstance(exc, ValidationError) and exc.errors():
        err = exc.errors()[0]
        loc = ".".join(str(part) for part in err.get("loc", ()))
        msg = err.get("msg", "Dados inválidos")
        return f"{loc}: {msg}" if loc else msg
    return str(exc) or "Linha inválida"


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

    async def import_csv(
        self,
        *,
        actor: Usuario,
        file_bytes: bytes,
        instituicao_id: UUID | None,
    ) -> AlunoImportResponse:
        if len(file_bytes) > _MAX_CSV_BYTES:
            raise AppError("Arquivo CSV excede 2MB")

        try:
            text = file_bytes.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise AppError("CSV deve estar em UTF-8") from exc

        reader = csv.DictReader(io.StringIO(text))
        if not reader.fieldnames:
            raise AppError("CSV sem cabeçalho")

        headers = {
            (name or "").strip().lower(): name
            for name in reader.fieldnames
            if name and name.strip()
        }
        missing = [col for col in ("nome", "email", "documento") if col not in headers]
        if missing:
            raise AppError(f"Colunas obrigatórias ausentes: {', '.join(missing)}")

        tenant_id = self._resolve_instituicao_id_for_create(actor, instituicao_id)
        instituicao = await self._instituicoes.get_by_id(tenant_id)
        if instituicao is None:
            raise NotFoundError("Instituição não encontrada")

        created = 0
        skipped = 0
        errors: list[AlunoImportError] = []

        for line_no, raw in enumerate(reader, start=2):
            if created + skipped >= _MAX_CSV_ROWS:
                errors.append(
                    AlunoImportError(
                        linha=line_no,
                        mensagem="Limite de 500 linhas excedido; restante ignorado",
                    )
                )
                break

            try:
                status = AlunoStatus.PENDING
                if "status" in headers:
                    status_raw = (raw.get(headers["status"]) or "").strip().lower()
                    if status_raw:
                        status = AlunoStatus(status_raw)
                data = AlunoCreate(
                    nome=(raw.get(headers["nome"]) or "").strip(),
                    email=(raw.get(headers["email"]) or "").strip(),
                    documento=(raw.get(headers["documento"]) or "").strip(),
                    status=status,
                )
            except (ValueError, ValidationError) as exc:
                skipped += 1
                errors.append(
                    AlunoImportError(linha=line_no, mensagem=_first_validation_message(exc))
                )
                continue

            email = str(data.email).lower()
            conflict = await self._alunos.find_conflict(
                instituicao_id=tenant_id,
                email=email,
                documento=data.documento,
            )
            if conflict is not None:
                skipped += 1
                errors.append(
                    AlunoImportError(
                        linha=line_no,
                        mensagem="E-mail ou documento já cadastrado nesta instituição",
                    )
                )
                continue

            await self._alunos.create(
                instituicao_id=tenant_id,
                nome=data.nome.strip(),
                email=email,
                documento=data.documento,
                status=data.status,
            )
            created += 1

        await self._session.commit()
        return AlunoImportResponse(created=created, skipped=skipped, errors=errors)

    async def _get_or_404(self, aluno_id: UUID, *, actor: Usuario) -> Aluno:
        tenant = self._tenant_id_for_queries(actor)
        aluno = await self._alunos.get_by_id(aluno_id, instituicao_id=tenant)
        if aluno is None:
            raise NotFoundError("Aluno não encontrado")
        return aluno
