from __future__ import annotations

import csv
import io
from uuid import UUID

from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cpf import normalize_cpf
from app.core.exceptions import AppError, ConflictError, ForbiddenError, NotFoundError
from app.models.certificado import CertificadoStatus
from app.models.participante import Participante, ParticipanteStatus
from app.models.usuario import Usuario, UsuarioRole
from app.repositories.certificado_repository import CertificadoRepository
from app.repositories.inscricao_repository import InscricaoRepository
from app.repositories.instituicao_repository import InstituicaoRepository
from app.repositories.participante_repository import ParticipanteRepository
from app.schemas.participante import (
    ParticipanteCreate,
    ParticipanteDetalheResponse,
    ParticipanteEventoResponse,
    ParticipanteImportError,
    ParticipanteImportResponse,
    ParticipanteResponse,
    ParticipanteUpdate,
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


async def resolve_or_create_participante(
    repo: ParticipanteRepository,
    *,
    instituicao_id: UUID,
    nome: str,
    email: str,
    documento: str,
    status: ParticipanteStatus = ParticipanteStatus.PENDING,
) -> tuple[Participante, bool]:
    """CPF é a identidade no tenant: reutiliza o cadastro existente ou cria um novo."""
    existing = await repo.get_by_documento(
        instituicao_id=instituicao_id,
        documento=documento,
    )
    if existing is not None:
        return existing, False

    by_email = await repo.get_by_email(instituicao_id=instituicao_id, email=email)
    if by_email is not None:
        raise ConflictError("E-mail já cadastrado com outro CPF nesta instituição")

    created = await repo.create(
        instituicao_id=instituicao_id,
        nome=nome.strip(),
        email=email,
        documento=documento,
        status=status,
    )
    return created, True


class ParticipanteService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._participantes = ParticipanteRepository(session)
        self._instituicoes = InstituicaoRepository(session)
        self._inscricoes = InscricaoRepository(session)
        self._certificados = CertificadoRepository(session)

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
            raise ForbiddenError("Não é permitido criar participante em outro tenant")

        return actor.instituicao_id

    async def create(self, data: ParticipanteCreate, *, actor: Usuario) -> ParticipanteResponse:
        instituicao_id = self._resolve_instituicao_id_for_create(actor, data.instituicao_id)

        instituicao = await self._instituicoes.get_by_id(instituicao_id)
        if instituicao is None:
            raise NotFoundError("Instituição não encontrada")

        email = str(data.email).lower()
        participante, created = await resolve_or_create_participante(
            self._participantes,
            instituicao_id=instituicao_id,
            nome=data.nome.strip(),
            email=email,
            documento=data.documento,
            status=data.status,
        )
        if created:
            await self._session.commit()
            await self._session.refresh(participante)
        return ParticipanteResponse.model_validate(participante)

    async def list(
        self,
        *,
        actor: Usuario,
        instituicao_id: UUID | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[ParticipanteResponse]:
        tenant = self._tenant_id_for_queries(actor)

        if actor.role == UsuarioRole.SUPER_ADMIN:
            filter_id = instituicao_id
        else:
            if instituicao_id is not None and instituicao_id != tenant:
                raise ForbiddenError("Não é permitido listar participantes de outro tenant")
            filter_id = tenant

        items = await self._participantes.list(
            instituicao_id=filter_id,
            skip=skip,
            limit=limit,
        )
        return [ParticipanteResponse.model_validate(item) for item in items]

    async def get(self, participante_id: UUID, *, actor: Usuario) -> ParticipanteDetalheResponse:
        participante = await self._get_or_404(participante_id, actor=actor)
        return await self._to_detalhe(participante)

    async def get_by_cpf(
        self,
        documento: str,
        *,
        actor: Usuario,
        instituicao_id: UUID | None = None,
    ) -> ParticipanteDetalheResponse:
        try:
            cpf = normalize_cpf(documento)
        except ValueError as exc:
            raise AppError(str(exc)) from exc

        tenant = self._tenant_id_for_queries(actor)
        if actor.role == UsuarioRole.SUPER_ADMIN:
            filter_id = instituicao_id
        else:
            if instituicao_id is not None and instituicao_id != tenant:
                raise ForbiddenError("Não é permitido consultar participante de outro tenant")
            filter_id = tenant

        if filter_id is not None:
            participante = await self._participantes.get_by_documento(
                instituicao_id=filter_id,
                documento=cpf,
            )
        else:
            matches = await self._participantes.list_by_documento(cpf)
            if len(matches) > 1:
                raise AppError("Informe instituicao_id: este CPF existe em mais de uma instituição")
            participante = matches[0] if matches else None

        if participante is None:
            raise NotFoundError("Participante não encontrado")
        return await self._to_detalhe(participante)

    async def update(
        self,
        participante_id: UUID,
        data: ParticipanteUpdate,
        *,
        actor: Usuario,
    ) -> ParticipanteResponse:
        participante = await self._get_or_404(participante_id, actor=actor)
        payload = data.model_dump(exclude_unset=True)

        if "nome" in payload and payload["nome"] is not None:
            payload["nome"] = payload["nome"].strip()
        if "email" in payload and payload["email"] is not None:
            payload["email"] = str(payload["email"]).lower()

        novo_email = payload.get("email", participante.email)
        novo_documento = payload.get("documento", participante.documento)
        if "email" in payload or "documento" in payload:
            conflict = await self._participantes.find_conflict(
                instituicao_id=participante.instituicao_id,
                email=novo_email,
                documento=novo_documento,
                exclude_id=participante.id,
            )
            if conflict is not None:
                raise ConflictError("E-mail ou CPF já cadastrado nesta instituição")

        for field, value in payload.items():
            setattr(participante, field, value)

        await self._participantes.save(participante)
        await self._session.commit()
        await self._session.refresh(participante)
        return ParticipanteResponse.model_validate(participante)

    async def set_status(
        self,
        participante_id: UUID,
        status: ParticipanteStatus,
        *,
        actor: Usuario,
    ) -> ParticipanteResponse:
        participante = await self._get_or_404(participante_id, actor=actor)
        participante.status = status
        await self._participantes.save(participante)
        await self._session.commit()
        await self._session.refresh(participante)
        return ParticipanteResponse.model_validate(participante)

    async def delete(self, participante_id: UUID, *, actor: Usuario) -> None:
        participante = await self._get_or_404(participante_id, actor=actor)
        certificados = await self._participantes.count_certificados(participante.id)
        if certificados > 0:
            raise ConflictError(
                "Participante possui certificados emitidos e não pode ser excluído"
            )

        await self._participantes.delete(participante)
        await self._session.commit()

    async def import_csv(
        self,
        *,
        actor: Usuario,
        file_bytes: bytes,
        instituicao_id: UUID | None,
    ) -> ParticipanteImportResponse:
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
        documento_key = "cpf" if "cpf" in headers else "documento"
        if "nome" not in headers or "email" not in headers or documento_key not in headers:
            raise AppError("Colunas obrigatórias ausentes: nome, email, documento (ou cpf)")

        tenant_id = self._resolve_instituicao_id_for_create(actor, instituicao_id)
        instituicao = await self._instituicoes.get_by_id(tenant_id)
        if instituicao is None:
            raise NotFoundError("Instituição não encontrada")

        created = 0
        skipped = 0
        reused = 0
        errors: list[ParticipanteImportError] = []

        for line_no, raw in enumerate(reader, start=2):
            if created + skipped + reused >= _MAX_CSV_ROWS:
                errors.append(
                    ParticipanteImportError(
                        linha=line_no,
                        mensagem="Limite de 500 linhas excedido; restante ignorado",
                    )
                )
                break

            try:
                status = ParticipanteStatus.PENDING
                if "status" in headers:
                    status_raw = (raw.get(headers["status"]) or "").strip().lower()
                    if status_raw:
                        status = ParticipanteStatus(status_raw)
                data = ParticipanteCreate(
                    nome=(raw.get(headers["nome"]) or "").strip(),
                    email=(raw.get(headers["email"]) or "").strip(),
                    documento=(raw.get(headers[documento_key]) or "").strip(),
                    status=status,
                )
            except (ValueError, ValidationError) as exc:
                skipped += 1
                errors.append(
                    ParticipanteImportError(
                        linha=line_no,
                        mensagem=_first_validation_message(exc),
                    )
                )
                continue

            email = str(data.email).lower()
            try:
                _, was_created = await resolve_or_create_participante(
                    self._participantes,
                    instituicao_id=tenant_id,
                    nome=data.nome.strip(),
                    email=email,
                    documento=data.documento,
                    status=data.status,
                )
            except ConflictError as exc:
                skipped += 1
                errors.append(
                    ParticipanteImportError(linha=line_no, mensagem=exc.message)
                )
                continue

            if was_created:
                created += 1
            else:
                reused += 1

        await self._session.commit()
        return ParticipanteImportResponse(
            created=created,
            skipped=skipped,
            reused=reused,
            errors=errors,
        )

    async def _get_or_404(self, participante_id: UUID, *, actor: Usuario) -> Participante:
        tenant = self._tenant_id_for_queries(actor)
        participante = await self._participantes.get_by_id(
            participante_id,
            instituicao_id=tenant,
        )
        if participante is None:
            raise NotFoundError("Participante não encontrado")
        return participante

    async def _to_detalhe(self, participante: Participante) -> ParticipanteDetalheResponse:
        inscricoes = await self._inscricoes.list_by_participante(
            instituicao_id=participante.instituicao_id,
            participante_id=participante.id,
        )
        certificados = await self._certificados.list_by_participante(
            instituicao_id=participante.instituicao_id,
            participante_id=participante.id,
        )
        cert_by_curso = {
            item.curso_id: item
            for item in certificados
            if item.status == CertificadoStatus.ACTIVE
        }
        eventos: list[ParticipanteEventoResponse] = []
        for inscricao in inscricoes:
            curso = inscricao.curso
            if curso is None:
                continue
            certificado = cert_by_curso.get(inscricao.curso_id)
            eventos.append(
                ParticipanteEventoResponse(
                    curso_id=curso.id,
                    curso_titulo=curso.titulo,
                    data_evento=curso.data_evento,
                    curso_status=curso.status,
                    inscrito_em=inscricao.created_at,
                    ja_emitido=certificado is not None,
                    certificado_id=certificado.id if certificado else None,
                    numero_certificado=(
                        certificado.numero_certificado if certificado else None
                    ),
                )
            )
        base = ParticipanteResponse.model_validate(participante)
        return ParticipanteDetalheResponse(**base.model_dump(), eventos=eventos)
