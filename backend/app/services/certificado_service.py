from __future__ import annotations

import hashlib
import uuid
from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError, ConflictError, ForbiddenError, NotFoundError
from app.models.certificado import Certificado, CertificadoStatus
from app.models.certificado_acesso import CertificadoAcessoTipo
from app.models.curso import Curso, CursoStatus
from app.models.instituicao import Instituicao
from app.models.participante import Participante, ParticipanteStatus
from app.models.usuario import Usuario, UsuarioRole
from app.repositories.certificado_acesso_repository import CertificadoAcessoRepository
from app.repositories.certificado_repository import CertificadoRepository
from app.repositories.curso_repository import CursoRepository
from app.repositories.inscricao_repository import InscricaoRepository
from app.repositories.instituicao_repository import InstituicaoRepository
from app.repositories.participante_repository import ParticipanteRepository
from app.schemas.certificado import (
    CertificadoEmitLoteErro,
    CertificadoEmitLoteRequest,
    CertificadoEmitLoteResponse,
    CertificadoEmitRequest,
    CertificadoPublicResponse,
    CertificadoResponse,
)
from app.services.certificate_templates import (
    is_valid_template_id,
    resolve_frente_copy,
    resolve_template_id,
)
from app.services.pdf_service import CertificateRenderData, PdfService


class CertificadoService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._certificados = CertificadoRepository(session)
        self._acessos = CertificadoAcessoRepository(session)
        self._participantes = ParticipanteRepository(session)
        self._cursos = CursoRepository(session)
        self._instituicoes = InstituicaoRepository(session)
        self._inscricoes = InscricaoRepository(session)
        self._pdf = PdfService()

    def _tenant_id_for_queries(self, actor: Usuario) -> UUID | None:
        if actor.role == UsuarioRole.SUPER_ADMIN:
            return None
        if actor.instituicao_id is None:
            raise ForbiddenError("Usuário sem instituição vinculada")
        return actor.instituicao_id

    def _resolve_instituicao_id(
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
            raise ForbiddenError("Não é permitido emitir certificado em outro tenant")

        return actor.instituicao_id

    @staticmethod
    def _build_numero(codigo_validacao: UUID) -> str:
        year = datetime.now(timezone.utc).year
        return f"CERT-{year}-{str(codigo_validacao).split('-')[0].upper()}"

    @staticmethod
    def _compute_sha256(
        *,
        codigo_validacao: UUID,
        numero: str,
        participante_nome: str,
        curso_titulo: str,
        instituicao_nome: str,
        carga_horaria: int,
        verso_parcerias: str | None = None,
        verso_conteudos: str | None = None,
        verso_observacoes: str | None = None,
        frente_tipo: str | None = None,
        frente_titulo: str | None = None,
        frente_atestacao: str | None = None,
    ) -> str:
        payload = "|".join(
            [
                str(codigo_validacao),
                numero,
                participante_nome,
                curso_titulo,
                instituicao_nome,
                str(carga_horaria),
                verso_parcerias or "",
                verso_conteudos or "",
                verso_observacoes or "",
                frente_tipo or "",
                frente_titulo or "",
                frente_atestacao or "",
            ]
        )
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def _assert_can_emit(self, curso: Curso) -> None:
        if curso.status == CursoStatus.CANCELLED:
            raise AppError("Não é permitido emitir certificado de evento cancelado")
        if curso.status == CursoStatus.DRAFT:
            raise AppError("Não é permitido emitir certificado de evento em rascunho")
        if not curso.exigir_conclusao_para_emitir:
            return
        if curso.status != CursoStatus.COMPLETED:
            raise AppError("Conclua o evento antes de emitir certificados")
        if not curso.emissao_liberada:
            raise AppError(
                "A emissão ainda não foi validada e liberada para este evento"
            )

    @staticmethod
    def _assert_participante_apto(participante: Participante) -> None:
        if participante.status == ParticipanteStatus.REJECTED:
            raise AppError("Participante reprovado não pode receber certificado")
        if participante.status != ParticipanteStatus.VERIFIED:
            raise AppError("Aprove o participante antes de emitir o certificado")

    async def _ensure_inscricao(
        self,
        *,
        instituicao_id: UUID,
        participante_id: UUID,
        curso_id: UUID,
    ) -> None:
        existing = await self._inscricoes.get_by_participante_curso(
            instituicao_id=instituicao_id,
            participante_id=participante_id,
            curso_id=curso_id,
        )
        if existing is not None:
            if existing.cancelada:
                raise AppError("Inscrição cancelada neste evento")
            return
        await self._inscricoes.create(
            instituicao_id=instituicao_id,
            participante_id=participante_id,
            curso_id=curso_id,
        )

    async def _create_certificado(
        self,
        *,
        instituicao: Instituicao,
        curso: Curso,
        participante_id: UUID,
        participante_nome: str,
    ) -> Certificado:
        codigo_validacao = uuid.uuid4()
        numero = self._build_numero(codigo_validacao)
        frente_tipo, frente_titulo, frente_atestacao = resolve_frente_copy(
            template_id=curso.template_id,
            frente_tipo=curso.frente_tipo,
            frente_titulo=curso.frente_titulo,
            frente_atestacao=curso.frente_atestacao,
        )
        sha256 = self._compute_sha256(
            codigo_validacao=codigo_validacao,
            numero=numero,
            participante_nome=participante_nome,
            curso_titulo=curso.titulo,
            instituicao_nome=instituicao.nome,
            carga_horaria=curso.carga_horaria,
            verso_parcerias=curso.verso_parcerias,
            verso_conteudos=curso.verso_conteudos,
            verso_observacoes=curso.verso_observacoes,
            frente_tipo=frente_tipo,
            frente_titulo=frente_titulo,
            frente_atestacao=frente_atestacao,
        )
        return await self._certificados.create(
            codigo_validacao=codigo_validacao,
            instituicao_id=instituicao.id,
            curso_id=curso.id,
            participante_id=participante_id,
            numero_certificado=numero,
            participante_nome=participante_nome,
            curso_titulo=curso.titulo,
            instituicao_nome=instituicao.nome,
            carga_horaria=curso.carga_horaria,
            instrutor=curso.instrutor,
            template_id=resolve_template_id(curso.template_id),
            frente_tipo=frente_tipo,
            frente_titulo=frente_titulo,
            frente_atestacao=frente_atestacao,
            verso_parcerias=curso.verso_parcerias,
            verso_conteudos=curso.verso_conteudos,
            verso_observacoes=curso.verso_observacoes,
            sha256=sha256,
            status=CertificadoStatus.ACTIVE,
        )

    async def sincronizar_snapshot_do_curso(self, curso: Curso) -> int:
        ativos = await self._certificados.list_ativos_by_curso(
            instituicao_id=curso.instituicao_id,
            curso_id=curso.id,
        )
        if not ativos:
            return 0

        frente_tipo, frente_titulo, frente_atestacao = resolve_frente_copy(
            template_id=curso.template_id,
            frente_tipo=curso.frente_tipo,
            frente_titulo=curso.frente_titulo,
            frente_atestacao=curso.frente_atestacao,
        )
        template_id = resolve_template_id(curso.template_id)

        for certificado in ativos:
            certificado.curso_titulo = curso.titulo
            certificado.carga_horaria = curso.carga_horaria
            certificado.instrutor = curso.instrutor
            certificado.template_id = template_id
            certificado.frente_tipo = frente_tipo
            certificado.frente_titulo = frente_titulo
            certificado.frente_atestacao = frente_atestacao
            certificado.verso_parcerias = curso.verso_parcerias
            certificado.verso_conteudos = curso.verso_conteudos
            certificado.verso_observacoes = curso.verso_observacoes
            certificado.sha256 = self._compute_sha256(
                codigo_validacao=certificado.codigo_validacao,
                numero=certificado.numero_certificado,
                participante_nome=certificado.participante_nome,
                curso_titulo=curso.titulo,
                instituicao_nome=certificado.instituicao_nome,
                carga_horaria=curso.carga_horaria,
                verso_parcerias=curso.verso_parcerias,
                verso_conteudos=curso.verso_conteudos,
                verso_observacoes=curso.verso_observacoes,
                frente_tipo=frente_tipo,
                frente_titulo=frente_titulo,
                frente_atestacao=frente_atestacao,
            )

        await self._session.flush()
        return len(ativos)

    async def emitir(
        self,
        data: CertificadoEmitRequest,
        *,
        actor: Usuario,
    ) -> CertificadoResponse:
        instituicao_id = self._resolve_instituicao_id(actor, data.instituicao_id)

        instituicao = await self._instituicoes.get_by_id(instituicao_id)
        if instituicao is None:
            raise NotFoundError("Instituição não encontrada")

        participante = await self._participantes.get_by_id(
            data.participante_id,
            instituicao_id=instituicao_id,
        )
        if participante is None:
            raise NotFoundError("Participante não encontrado neste tenant")
        self._assert_participante_apto(participante)

        curso = await self._cursos.get_by_id(data.curso_id, instituicao_id=instituicao_id)
        if curso is None:
            raise NotFoundError("Curso não encontrado neste tenant")

        self._assert_can_emit(curso)
        await self._ensure_inscricao(
            instituicao_id=instituicao_id,
            participante_id=participante.id,
            curso_id=curso.id,
        )

        existing = await self._certificados.get_active_by_participante_curso(
            instituicao_id=instituicao_id,
            participante_id=participante.id,
            curso_id=curso.id,
        )
        if existing is not None:
            raise ConflictError(
                "Já existe certificado ativo para este participante e curso"
            )

        certificado = await self._create_certificado(
            instituicao=instituicao,
            curso=curso,
            participante_id=participante.id,
            participante_nome=participante.nome,
        )
        await self._session.commit()
        await self._session.refresh(certificado)
        return CertificadoResponse.model_validate(certificado)

    async def emitir_lote(
        self,
        data: CertificadoEmitLoteRequest,
        *,
        actor: Usuario,
    ) -> CertificadoEmitLoteResponse:
        instituicao_id = self._resolve_instituicao_id(actor, data.instituicao_id)

        instituicao = await self._instituicoes.get_by_id(instituicao_id)
        if instituicao is None:
            raise NotFoundError("Instituição não encontrada")

        curso = await self._cursos.get_by_id(data.curso_id, instituicao_id=instituicao_id)
        if curso is None:
            raise NotFoundError("Curso não encontrado neste tenant")

        self._assert_can_emit(curso)

        unique_ids = list(dict.fromkeys(data.participante_ids))
        emitidos: list[CertificadoResponse] = []
        erros: list[CertificadoEmitLoteErro] = []

        for participante_id in unique_ids:
            participante = await self._participantes.get_by_id(
                participante_id,
                instituicao_id=instituicao_id,
            )
            if participante is None:
                erros.append(
                    CertificadoEmitLoteErro(
                        participante_id=participante_id,
                        mensagem="Participante não encontrado neste tenant",
                    )
                )
                continue

            try:
                self._assert_participante_apto(participante)
            except AppError as exc:
                erros.append(
                    CertificadoEmitLoteErro(
                        participante_id=participante.id,
                        mensagem=exc.message,
                    )
                )
                continue

            await self._ensure_inscricao(
                instituicao_id=instituicao_id,
                participante_id=participante.id,
                curso_id=curso.id,
            )

            existing = await self._certificados.get_active_by_participante_curso(
                instituicao_id=instituicao_id,
                participante_id=participante.id,
                curso_id=curso.id,
            )
            if existing is not None:
                erros.append(
                    CertificadoEmitLoteErro(
                        participante_id=participante.id,
                        mensagem="Já existe certificado ativo para este participante e curso",
                    )
                )
                continue

            certificado = await self._create_certificado(
                instituicao=instituicao,
                curso=curso,
                participante_id=participante.id,
                participante_nome=participante.nome,
            )
            emitidos.append(CertificadoResponse.model_validate(certificado))

        await self._session.commit()
        return CertificadoEmitLoteResponse(emitidos=emitidos, erros=erros)

    async def list(
        self,
        *,
        actor: Usuario,
        instituicao_id: UUID | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[CertificadoResponse]:
        tenant = self._tenant_id_for_queries(actor)

        if actor.role == UsuarioRole.SUPER_ADMIN:
            filter_id = instituicao_id
        else:
            if instituicao_id is not None and instituicao_id != tenant:
                raise ForbiddenError("Não é permitido listar certificados de outro tenant")
            filter_id = tenant

        items = await self._certificados.list(
            instituicao_id=filter_id,
            skip=skip,
            limit=limit,
        )
        return [CertificadoResponse.model_validate(item) for item in items]

    async def get(self, certificado_id: UUID, *, actor: Usuario) -> CertificadoResponse:
        certificado = await self._get_or_404(certificado_id, actor=actor)
        return CertificadoResponse.model_validate(certificado)

    async def revogar(
        self,
        certificado_id: UUID,
        *,
        actor: Usuario,
        commit: bool = True,
    ) -> CertificadoResponse:
        certificado = await self._get_or_404(certificado_id, actor=actor)
        if certificado.status == CertificadoStatus.REVOKED:
            raise ConflictError("Certificado já está revogado")

        certificado.status = CertificadoStatus.REVOKED
        await self._certificados.save(certificado)
        if commit:
            await self._session.commit()
            await self._session.refresh(certificado)
        return CertificadoResponse.model_validate(certificado)

    async def gerar_html(self, certificado_id: UUID, *, actor: Usuario) -> str:
        certificado = await self._get_or_404(certificado_id, actor=actor)
        if certificado.status != CertificadoStatus.ACTIVE:
            raise AppError("Somente certificados ativos podem ser visualizados")
        return await self._render_html(
            certificado,
            tipo_acesso=CertificadoAcessoTipo.VISUALIZACAO,
        )

    async def gerar_html_publico(self, codigo: UUID) -> str:
        certificado = await self._certificados.get_by_codigo_validacao(codigo)
        if certificado is None or certificado.status != CertificadoStatus.ACTIVE:
            raise NotFoundError("Certificado não encontrado")
        return await self._render_html(
            certificado,
            tipo_acesso=CertificadoAcessoTipo.VISUALIZACAO,
        )

    async def gerar_pdf(self, certificado_id: UUID, *, actor: Usuario) -> tuple[bytes, str]:
        certificado = await self._get_or_404(certificado_id, actor=actor)
        if certificado.status != CertificadoStatus.ACTIVE:
            raise AppError("Somente certificados ativos podem gerar PDF")
        return await self._render_pdf(
            certificado,
            tipo_acesso=CertificadoAcessoTipo.DOWNLOAD,
        )

    async def gerar_pdf_publico(self, codigo: UUID) -> tuple[bytes, str]:
        certificado = await self._certificados.get_by_codigo_validacao(codigo)
        if certificado is None or certificado.status != CertificadoStatus.ACTIVE:
            raise NotFoundError("Certificado não encontrado")
        return await self._render_pdf(
            certificado,
            tipo_acesso=CertificadoAcessoTipo.DOWNLOAD,
        )

    async def preview_html(
        self,
        *,
        actor: Usuario,
        template_id: str,
        participante_nome: str,
        curso_titulo: str,
        instituicao_nome: str,
        carga_horaria: int,
        instrutor: str,
        instituicao_id: UUID | None,
        verso_parcerias: str | None = None,
        verso_conteudos: str | None = None,
        verso_observacoes: str | None = None,
        frente_tipo: str | None = None,
        frente_titulo: str | None = None,
        frente_atestacao: str | None = None,
        data_evento: date | None = None,
    ) -> str:
        if not is_valid_template_id(template_id):
            raise NotFoundError("Modelo de certificado não encontrado")

        logo_url: str | None = None
        assinatura_url: str | None = None
        resolved_nome = instituicao_nome.strip()

        if instituicao_id is not None:
            tenant = self._tenant_id_for_queries(actor)
            if tenant is not None and instituicao_id != tenant:
                raise ForbiddenError("Não é permitido pré-visualizar outro tenant")
            instituicao = await self._instituicoes.get_by_id(instituicao_id)
            if instituicao is None:
                raise NotFoundError("Instituição não encontrada")
            logo_url = instituicao.logo_url
            assinatura_url = instituicao.assinatura_url
            if not resolved_nome:
                resolved_nome = instituicao.nome

        data = PdfService.preview_data(
            template_id=template_id,
            participante_nome=participante_nome.strip() or "Nome do Participante",
            curso_titulo=curso_titulo.strip() or "Nome do evento",
            instituicao_nome=resolved_nome or "Instituição",
            carga_horaria=carga_horaria,
            instrutor=instrutor.strip(),
            logo_url=logo_url,
            assinatura_url=assinatura_url,
            verso_parcerias=verso_parcerias,
            verso_conteudos=verso_conteudos,
            verso_observacoes=verso_observacoes,
            frente_tipo=frente_tipo,
            frente_titulo=frente_titulo,
            frente_atestacao=frente_atestacao,
            data_evento=data_evento,
        )
        return self._pdf.render_certificado_html(data)

    async def _render_context(self, certificado: Certificado) -> CertificateRenderData:
        instituicao = await self._instituicoes.get_by_id(certificado.instituicao_id)
        curso = await self._cursos.get_by_id(certificado.curso_id)
        participante = await self._participantes.get_by_id(
            certificado.participante_id,
            instituicao_id=certificado.instituicao_id,
        )
        return self._pdf.data_from_certificado(
            certificado,
            participante_documento=participante.documento if participante else None,
            logo_url=instituicao.logo_url if instituicao else None,
            assinatura_url=instituicao.assinatura_url if instituicao else None,
            data_evento=curso.data_evento if curso else None,
        )

    async def _registrar_acesso(
        self,
        certificado: Certificado,
        *,
        tipo: CertificadoAcessoTipo,
    ) -> None:
        await self._acessos.registrar(
            certificado_id=certificado.id,
            instituicao_id=certificado.instituicao_id,
            tipo=tipo,
        )
        await self._session.commit()

    async def _render_html(
        self,
        certificado: Certificado,
        *,
        tipo_acesso: CertificadoAcessoTipo,
    ) -> str:
        html = self._pdf.render_certificado_html(await self._render_context(certificado))
        await self._registrar_acesso(certificado, tipo=tipo_acesso)
        return html

    async def _render_pdf(
        self,
        certificado: Certificado,
        *,
        tipo_acesso: CertificadoAcessoTipo,
    ) -> tuple[bytes, str]:
        pdf = self._pdf.render_certificado_pdf(await self._render_context(certificado))
        await self._registrar_acesso(certificado, tipo=tipo_acesso)
        filename = f"{certificado.numero_certificado}.pdf"
        return pdf, filename

    async def validar_publico(self, codigo: UUID) -> CertificadoPublicResponse:
        certificado = await self._certificados.get_by_codigo_validacao(codigo)
        if certificado is None:
            return CertificadoPublicResponse(
                valido=False,
                codigo_validacao=codigo,
                mensagem="Certificado não encontrado",
            )

        if certificado.status != CertificadoStatus.ACTIVE:
            return CertificadoPublicResponse(
                valido=False,
                codigo_validacao=codigo,
                numero_certificado=certificado.numero_certificado,
                participante_nome=certificado.participante_nome,
                curso_titulo=certificado.curso_titulo,
                instituicao_nome=certificado.instituicao_nome,
                carga_horaria=certificado.carga_horaria,
                instrutor=certificado.instrutor,
                status=certificado.status,
                emitido_em=certificado.created_at,
                mensagem=f"Certificado encontrado, porém com status: {certificado.status.value}",
            )

        return CertificadoPublicResponse(
            valido=True,
            codigo_validacao=codigo,
            numero_certificado=certificado.numero_certificado,
            participante_nome=certificado.participante_nome,
            curso_titulo=certificado.curso_titulo,
            instituicao_nome=certificado.instituicao_nome,
            carga_horaria=certificado.carga_horaria,
            instrutor=certificado.instrutor,
            status=certificado.status,
            emitido_em=certificado.created_at,
            mensagem="Certificado válido",
        )

    async def _get_or_404(self, certificado_id: UUID, *, actor: Usuario) -> Certificado:
        tenant = self._tenant_id_for_queries(actor)
        certificado = await self._certificados.get_by_id(
            certificado_id,
            instituicao_id=tenant,
        )
        if certificado is None:
            raise NotFoundError("Certificado não encontrado")
        return certificado
