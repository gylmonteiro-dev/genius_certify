from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError, ConflictError, ForbiddenError, NotFoundError
from app.models.catalogo_evento import CatalogoEventoKind
from app.models.certificado import Certificado, CertificadoStatus
from app.models.curso import Curso, CursoStatus
from app.models.inscricao import Inscricao
from app.models.usuario import Usuario, UsuarioRole
from app.repositories.catalogo_evento_repository import CatalogoEventoRepository
from app.repositories.certificado_repository import CertificadoRepository
from app.repositories.curso_repository import CursoRepository
from app.repositories.inscricao_repository import InscricaoRepository
from app.repositories.instituicao_repository import InstituicaoRepository
from app.repositories.participante_repository import ParticipanteRepository
from app.schemas.curso import (
    CancelarCursoRequest,
    CancelarInscritosLoteRequest,
    CancelarInscritosLoteResponse,
    CursoCreate,
    CursoResponse,
    CursoUpdate,
    CursoUpdateResponse,
    InscricaoLoteErro,
    InscricaoLoteRequest,
    InscricaoLoteResponse,
    InscritoResponse,
    LoteItemErro,
    RemoverInscritoRequest,
    RevogarCertificadosLoteRequest,
    RevogarCertificadosLoteResponse,
)
from app.services.certificate_templates import (
    is_valid_template_id,
    resolve_frente_tipo,
    resolve_template_id,
)
from app.services.certificado_service import CertificadoService

JUSTIFICATIVA_MIN_LEN = 10


class CursoService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._cursos = CursoRepository(session)
        self._instituicoes = InstituicaoRepository(session)
        self._inscricoes = InscricaoRepository(session)
        self._certificados = CertificadoRepository(session)
        self._participantes = ParticipanteRepository(session)
        self._catalogo = CatalogoEventoRepository(session)

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

    @staticmethod
    def _normalize_optional_text(value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @staticmethod
    def _normalize_frente_tipo(frente_tipo: str | None) -> str:
        requested = (frente_tipo or "").strip()
        tipo = resolve_frente_tipo(frente_tipo)
        if requested and requested != tipo:
            raise AppError("Tipo de certificado da frente inválido")
        return tipo

    async def _assert_catalog_value(
        self,
        *,
        field: str,
        kind: CatalogoEventoKind,
        value: str | None,
        current: str | None = None,
    ) -> str | None:
        slug = self._normalize_optional_text(value)
        if slug is None:
            return None
        if current is not None and slug == current:
            return slug
        item = await self._catalogo.get_by_kind_slug(kind, slug)
        if item is None or not item.ativo:
            raise AppError(f"{field} inválido")
        return slug

    async def create(self, data: CursoCreate, *, actor: Usuario) -> CursoResponse:
        if data.status == CursoStatus.CANCELLED:
            raise AppError("Use o cancelamento dedicado para cancelar um evento")

        instituicao_id = self._resolve_instituicao_id_for_create(actor, data.instituicao_id)

        instituicao = await self._instituicoes.get_by_id(instituicao_id)
        if instituicao is None:
            raise NotFoundError("Instituição não encontrada")

        template_id = resolve_template_id(data.template_id)
        if not is_valid_template_id(template_id):
            raise AppError("Modelo de certificado inválido")
        frente_tipo = self._normalize_frente_tipo(data.frente_tipo)
        frente_titulo = self._normalize_optional_text(data.frente_titulo)
        frente_atestacao = self._normalize_optional_text(data.frente_atestacao)

        categoria = await self._assert_catalog_value(
            field="categoria",
            kind=CatalogoEventoKind.CATEGORIA,
            value=data.categoria,
        )
        modalidade = await self._assert_catalog_value(
            field="modalidade",
            kind=CatalogoEventoKind.MODALIDADE,
            value=data.modalidade,
        )
        tipo = await self._assert_catalog_value(
            field="tipo",
            kind=CatalogoEventoKind.TIPO,
            value=data.tipo,
        )

        curso = await self._cursos.create(
            instituicao_id=instituicao_id,
            titulo=data.titulo.strip(),
            descricao=data.descricao,
            carga_horaria=data.carga_horaria,
            instrutor=data.instrutor.strip(),
            status=data.status,
            data_evento=data.data_evento,
            categoria=categoria,
            modalidade=modalidade,
            tipo=tipo,
            exigir_conclusao_para_emitir=data.exigir_conclusao_para_emitir,
            template_id=template_id,
            frente_tipo=frente_tipo,
            frente_titulo=frente_titulo,
            frente_atestacao=frente_atestacao,
            verso_parcerias=self._normalize_optional_text(data.verso_parcerias),
            verso_conteudos=self._normalize_optional_text(data.verso_conteudos),
            verso_observacoes=self._normalize_optional_text(data.verso_observacoes),
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
    ) -> CursoUpdateResponse:
        curso = await self._get_or_404(curso_id, actor=actor)
        if curso.status == CursoStatus.CANCELLED:
            raise ConflictError("Evento cancelado não pode ser editado")
        payload = data.model_dump(exclude_unset=True)
        atualizar_certificados = bool(payload.pop("atualizar_certificados_emitidos", False))

        if payload.get("status") == CursoStatus.CANCELLED:
            raise AppError("Use o cancelamento dedicado para cancelar um evento")

        if "titulo" in payload and payload["titulo"] is not None:
            payload["titulo"] = payload["titulo"].strip()
        if "instrutor" in payload and payload["instrutor"] is not None:
            payload["instrutor"] = payload["instrutor"].strip()
        if "categoria" in payload:
            payload["categoria"] = await self._assert_catalog_value(
                field="categoria",
                kind=CatalogoEventoKind.CATEGORIA,
                value=payload["categoria"],
                current=curso.categoria,
            )
        if "modalidade" in payload:
            payload["modalidade"] = await self._assert_catalog_value(
                field="modalidade",
                kind=CatalogoEventoKind.MODALIDADE,
                value=payload["modalidade"],
                current=curso.modalidade,
            )
        if "tipo" in payload:
            payload["tipo"] = await self._assert_catalog_value(
                field="tipo",
                kind=CatalogoEventoKind.TIPO,
                value=payload["tipo"],
                current=curso.tipo,
            )
        for verso_field in ("verso_parcerias", "verso_conteudos", "verso_observacoes"):
            if verso_field in payload:
                payload[verso_field] = self._normalize_optional_text(payload[verso_field])
        if "template_id" in payload and payload["template_id"] is not None:
            template_id = resolve_template_id(payload["template_id"])
            if not is_valid_template_id(template_id):
                raise AppError("Modelo de certificado inválido")
            payload["template_id"] = template_id
        if "frente_tipo" in payload:
            payload["frente_tipo"] = self._normalize_frente_tipo(payload["frente_tipo"])
        for frente_field in ("frente_titulo", "frente_atestacao"):
            if frente_field in payload:
                payload[frente_field] = self._normalize_optional_text(payload[frente_field])

        for field, value in payload.items():
            setattr(curso, field, value)

        await self._cursos.save(curso)
        certificados_atualizados = 0
        if atualizar_certificados:
            certificados_atualizados = await CertificadoService(
                self._session
            ).sincronizar_snapshot_do_curso(curso)
        await self._session.commit()
        await self._session.refresh(curso)
        return CursoUpdateResponse(
            **CursoResponse.model_validate(curso).model_dump(),
            certificados_atualizados=certificados_atualizados,
        )

    async def delete(self, curso_id: UUID, *, actor: Usuario) -> None:
        curso = await self._get_or_404(curso_id, actor=actor)
        certificados = await self._cursos.count_certificados(curso.id)
        if certificados > 0:
            raise ConflictError(
                "Curso possui certificados emitidos e não pode ser excluído"
            )

        await self._cursos.delete(curso)
        await self._session.commit()

    async def list_inscritos(
        self,
        curso_id: UUID,
        *,
        actor: Usuario,
    ) -> list[InscritoResponse]:
        curso = await self._get_or_404(curso_id, actor=actor)
        inscricoes = await self._inscricoes.list_by_curso(
            instituicao_id=curso.instituicao_id,
            curso_id=curso.id,
        )
        certificados = await self._certificados.list_by_curso(
            instituicao_id=curso.instituicao_id,
            curso_id=curso.id,
        )
        cert_by_participante: dict = {}
        for item in certificados:
            current = cert_by_participante.get(item.participante_id)
            if current is None:
                cert_by_participante[item.participante_id] = item
            elif (
                item.status == CertificadoStatus.ACTIVE
                and current.status != CertificadoStatus.ACTIVE
            ):
                cert_by_participante[item.participante_id] = item

        items: list[InscritoResponse] = []
        for inscricao in inscricoes:
            participante = inscricao.participante
            certificado = cert_by_participante.get(participante.id)
            items.append(
                InscritoResponse(
                    id=participante.id,
                    nome=participante.nome,
                    email=participante.email,
                    documento=participante.documento,
                    status=participante.status,
                    inscrito_em=inscricao.created_at,
                    ja_emitido=certificado is not None
                    and certificado.status == CertificadoStatus.ACTIVE,
                    certificado_id=certificado.id if certificado else None,
                    certificado_status=certificado.status if certificado else None,
                    numero_certificado=(
                        certificado.numero_certificado if certificado else None
                    ),
                    inscricao_cancelada=inscricao.cancelada,
                    cancelada_justificativa=inscricao.cancelada_justificativa,
                )
            )
        items.sort(key=lambda item: item.nome.lower())
        return items

    async def inscrever_lote(
        self,
        curso_id: UUID,
        data: InscricaoLoteRequest,
        *,
        actor: Usuario,
    ) -> InscricaoLoteResponse:
        curso = await self._get_or_404(curso_id, actor=actor)
        if curso.status == CursoStatus.CANCELLED:
            raise ConflictError("Não é possível inscrever em um evento cancelado")
        instituicao_id = curso.instituicao_id
        unique_ids = list(dict.fromkeys(data.participante_ids))

        enrolled = 0
        already_enrolled = 0
        errors: list[InscricaoLoteErro] = []

        for participante_id in unique_ids:
            participante = await self._participantes.get_by_id(
                participante_id,
                instituicao_id=instituicao_id,
            )
            if participante is None:
                errors.append(
                    InscricaoLoteErro(
                        participante_id=participante_id,
                        mensagem="Participante não encontrado neste tenant",
                    )
                )
                continue

            existing = await self._inscricoes.get_by_participante_curso(
                instituicao_id=instituicao_id,
                participante_id=participante.id,
                curso_id=curso.id,
            )
            if existing is not None:
                if existing.cancelada:
                    self._reativar_inscricao(existing)
                    enrolled += 1
                    continue
                already_enrolled += 1
                continue

            await self._inscricoes.create(
                instituicao_id=instituicao_id,
                participante_id=participante.id,
                curso_id=curso.id,
            )
            enrolled += 1

        await self._session.commit()
        return InscricaoLoteResponse(
            enrolled=enrolled,
            already_enrolled=already_enrolled,
            errors=errors,
        )

    async def remover_inscrito(
        self,
        curso_id: UUID,
        participante_id: UUID,
        data: RemoverInscritoRequest,
        *,
        actor: Usuario,
    ) -> None:
        curso = await self._get_or_404(curso_id, actor=actor)
        inscricao = await self._inscricoes.get_by_participante_curso(
            instituicao_id=curso.instituicao_id,
            participante_id=participante_id,
            curso_id=curso.id,
        )
        if inscricao is None:
            raise NotFoundError("Inscrição não encontrada")

        if inscricao.cancelada:
            return

        certificado = await self._certificados.get_active_by_participante_curso(
            instituicao_id=curso.instituicao_id,
            participante_id=participante_id,
            curso_id=curso.id,
        )
        if certificado is not None and data.revogar_certificado:
            await CertificadoService(self._session).revogar(
                certificado.id,
                actor=actor,
                commit=False,
            )

        justificativa = self._normalize_justificativa(data.justificativa)
        self._mark_inscricao_cancelada(inscricao, justificativa=justificativa)
        await self._session.commit()

    async def cancelar(
        self,
        curso_id: UUID,
        data: CancelarCursoRequest,
        *,
        actor: Usuario,
    ) -> CursoResponse:
        curso = await self._get_or_404(curso_id, actor=actor)
        if curso.status == CursoStatus.CANCELLED:
            raise ConflictError("Evento já está cancelado")

        ativos = await self._certificados.list_ativos_by_curso(
            instituicao_id=curso.instituicao_id,
            curso_id=curso.id,
        )
        if ativos:
            raise ConflictError(
                "Revogue os certificados ativos antes de cancelar o evento"
            )

        inscricoes = await self._inscricoes.list_by_curso(
            instituicao_id=curso.instituicao_id,
            curso_id=curso.id,
        )
        ativas = [item for item in inscricoes if not item.cancelada]
        justificativa = self._normalize_justificativa(data.justificativa)
        if ativas and (justificativa is None or len(justificativa) < JUSTIFICATIVA_MIN_LEN):
            raise AppError(
                "Informe uma justificativa com pelo menos "
                f"{JUSTIFICATIVA_MIN_LEN} caracteres para cancelar um evento com inscritos"
            )

        now = datetime.now(timezone.utc)
        for inscricao in ativas:
            self._mark_inscricao_cancelada(
                inscricao,
                justificativa=justificativa,
                when=now,
            )

        curso.status = CursoStatus.CANCELLED
        curso.cancelamento_justificativa = justificativa
        curso.cancelado_em = now
        await self._cursos.save(curso)
        await self._session.commit()
        await self._session.refresh(curso)
        return CursoResponse.model_validate(curso)

    async def revogar_certificados_lote(
        self,
        curso_id: UUID,
        data: RevogarCertificadosLoteRequest,
        *,
        actor: Usuario,
    ) -> RevogarCertificadosLoteResponse:
        curso = await self._get_or_404(curso_id, actor=actor)
        ativos = await self._certificados.list_ativos_by_curso(
            instituicao_id=curso.instituicao_id,
            curso_id=curso.id,
        )
        by_participante = {item.participante_id: item for item in ativos}

        if data.participante_ids:
            unique_ids = list(dict.fromkeys(data.participante_ids))
        else:
            unique_ids = list(by_participante.keys())

        revoked = 0
        skipped = 0
        errors: list[LoteItemErro] = []
        cert_service = CertificadoService(self._session)

        for participante_id in unique_ids:
            certificado = by_participante.get(participante_id)
            if certificado is None:
                skipped += 1
                continue
            try:
                await cert_service.revogar(certificado.id, actor=actor, commit=False)
                revoked += 1
            except AppError as exc:
                errors.append(
                    LoteItemErro(participante_id=participante_id, mensagem=exc.message)
                )

        await self._session.commit()
        return RevogarCertificadosLoteResponse(
            revoked=revoked,
            skipped=skipped,
            errors=errors,
        )

    async def cancelar_inscritos_lote(
        self,
        curso_id: UUID,
        data: CancelarInscritosLoteRequest,
        *,
        actor: Usuario,
    ) -> CancelarInscritosLoteResponse:
        curso = await self._get_or_404(curso_id, actor=actor)
        unique_ids = list(dict.fromkeys(data.participante_ids))
        justificativa = self._normalize_justificativa(data.justificativa)
        now = datetime.now(timezone.utc)

        pending: list[tuple[UUID, Inscricao, Certificado | None]] = []
        errors: list[LoteItemErro] = []
        skipped = 0

        for participante_id in unique_ids:
            inscricao = await self._inscricoes.get_by_participante_curso(
                instituicao_id=curso.instituicao_id,
                participante_id=participante_id,
                curso_id=curso.id,
            )
            if inscricao is None:
                errors.append(
                    LoteItemErro(
                        participante_id=participante_id,
                        mensagem="Inscrição não encontrada",
                    )
                )
                continue
            if inscricao.cancelada:
                skipped += 1
                continue
            certificado = await self._certificados.get_active_by_participante_curso(
                instituicao_id=curso.instituicao_id,
                participante_id=participante_id,
                curso_id=curso.id,
            )
            pending.append((participante_id, inscricao, certificado))

        if any(cert is not None for _pid, _insc, cert in pending) and not data.revogar_certificados:
            raise ConflictError(
                "Há certificados ativos na seleção. Revogue-os antes de cancelar as inscrições."
            )

        revoked = 0
        cancelled = 0
        cert_service = CertificadoService(self._session)
        for participante_id, inscricao, certificado in pending:
            if certificado is not None:
                try:
                    await cert_service.revogar(certificado.id, actor=actor, commit=False)
                    revoked += 1
                except AppError as exc:
                    errors.append(
                        LoteItemErro(
                            participante_id=participante_id,
                            mensagem=exc.message,
                        )
                    )
                    continue
            self._mark_inscricao_cancelada(
                inscricao,
                justificativa=justificativa,
                when=now,
            )
            cancelled += 1

        await self._session.commit()
        return CancelarInscritosLoteResponse(
            cancelled=cancelled,
            skipped=skipped,
            revoked=revoked,
            errors=errors,
        )

    async def liberar_emissao(self, curso_id: UUID, *, actor: Usuario) -> CursoResponse:
        curso = await self._get_or_404(curso_id, actor=actor)
        if curso.status == CursoStatus.CANCELLED:
            raise ConflictError("Evento cancelado não pode ter emissão liberada")
        if curso.exigir_conclusao_para_emitir and curso.status != CursoStatus.COMPLETED:
            raise AppError(
                "Conclua o evento antes de validar e liberar a emissão"
            )
        if curso.emissao_liberada:
            raise ConflictError("A emissão já está liberada para este evento")

        curso.emissao_liberada = True
        await self._cursos.save(curso)
        await self._session.commit()
        await self._session.refresh(curso)
        return CursoResponse.model_validate(curso)

    async def _get_or_404(self, curso_id: UUID, *, actor: Usuario) -> Curso:
        tenant = self._tenant_id_for_queries(actor)
        curso = await self._cursos.get_by_id(curso_id, instituicao_id=tenant)
        if curso is None:
            raise NotFoundError("Curso não encontrado")
        return curso

    @staticmethod
    def _normalize_justificativa(value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @staticmethod
    def _mark_inscricao_cancelada(
        inscricao: Inscricao,
        *,
        justificativa: str | None,
        when: datetime | None = None,
    ) -> None:
        inscricao.cancelada = True
        inscricao.cancelada_em = when or datetime.now(timezone.utc)
        inscricao.cancelada_justificativa = justificativa

    @staticmethod
    def _reativar_inscricao(inscricao: Inscricao) -> None:
        inscricao.cancelada = False
        inscricao.cancelada_em = None
        inscricao.cancelada_justificativa = None
