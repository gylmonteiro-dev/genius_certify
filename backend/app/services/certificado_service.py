import hashlib
import uuid
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError, ConflictError, ForbiddenError, NotFoundError
from app.models.certificado import Certificado, CertificadoStatus
from app.models.usuario import Usuario, UsuarioRole
from app.repositories.aluno_repository import AlunoRepository
from app.repositories.certificado_repository import CertificadoRepository
from app.repositories.curso_repository import CursoRepository
from app.repositories.instituicao_repository import InstituicaoRepository
from app.schemas.certificado import (
    CertificadoEmitRequest,
    CertificadoPublicResponse,
    CertificadoResponse,
)
from app.services.pdf_service import PdfService


class CertificadoService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._certificados = CertificadoRepository(session)
        self._alunos = AlunoRepository(session)
        self._cursos = CursoRepository(session)
        self._instituicoes = InstituicaoRepository(session)
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
        aluno_nome: str,
        curso_titulo: str,
        instituicao_nome: str,
        carga_horaria: int,
    ) -> str:
        payload = "|".join(
            [
                str(codigo_validacao),
                numero,
                aluno_nome,
                curso_titulo,
                instituicao_nome,
                str(carga_horaria),
            ]
        )
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

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

        aluno = await self._alunos.get_by_id(data.aluno_id, instituicao_id=instituicao_id)
        if aluno is None:
            raise NotFoundError("Aluno não encontrado neste tenant")

        curso = await self._cursos.get_by_id(data.curso_id, instituicao_id=instituicao_id)
        if curso is None:
            raise NotFoundError("Curso não encontrado neste tenant")

        existing = await self._certificados.get_active_by_aluno_curso(
            instituicao_id=instituicao_id,
            aluno_id=aluno.id,
            curso_id=curso.id,
        )
        if existing is not None:
            raise ConflictError("Já existe certificado ativo para este aluno e curso")

        codigo_validacao = uuid.uuid4()
        numero = self._build_numero(codigo_validacao)
        sha256 = self._compute_sha256(
            codigo_validacao=codigo_validacao,
            numero=numero,
            aluno_nome=aluno.nome,
            curso_titulo=curso.titulo,
            instituicao_nome=instituicao.nome,
            carga_horaria=curso.carga_horaria,
        )

        certificado = await self._certificados.create(
            codigo_validacao=codigo_validacao,
            instituicao_id=instituicao_id,
            curso_id=curso.id,
            aluno_id=aluno.id,
            numero_certificado=numero,
            aluno_nome=aluno.nome,
            curso_titulo=curso.titulo,
            instituicao_nome=instituicao.nome,
            carga_horaria=curso.carga_horaria,
            instrutor=curso.instrutor,
            sha256=sha256,
            status=CertificadoStatus.ACTIVE,
        )
        await self._session.commit()
        await self._session.refresh(certificado)
        return CertificadoResponse.model_validate(certificado)

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

    async def revogar(self, certificado_id: UUID, *, actor: Usuario) -> CertificadoResponse:
        certificado = await self._get_or_404(certificado_id, actor=actor)
        if certificado.status == CertificadoStatus.REVOKED:
            raise ConflictError("Certificado já está revogado")

        certificado.status = CertificadoStatus.REVOKED
        await self._certificados.save(certificado)
        await self._session.commit()
        await self._session.refresh(certificado)
        return CertificadoResponse.model_validate(certificado)

    async def gerar_pdf(self, certificado_id: UUID, *, actor: Usuario) -> tuple[bytes, str]:
        certificado = await self._get_or_404(certificado_id, actor=actor)
        if certificado.status != CertificadoStatus.ACTIVE:
            raise AppError("Somente certificados ativos podem gerar PDF")

        instituicao = await self._instituicoes.get_by_id(certificado.instituicao_id)
        pdf = self._pdf.render_certificado_pdf(
            certificado,
            logo_url=instituicao.logo_url if instituicao else None,
            assinatura_url=instituicao.assinatura_url if instituicao else None,
        )
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
                aluno_nome=certificado.aluno_nome,
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
            aluno_nome=certificado.aluno_nome,
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
