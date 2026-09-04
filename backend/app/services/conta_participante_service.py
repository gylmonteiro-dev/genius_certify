import hashlib
import secrets
from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.cpf import normalize_cpf
from app.core.exceptions import AppError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError
from app.core.security import (
    create_participante_access_token,
    hash_password,
    verify_password,
)
from app.models.certificado import Certificado, CertificadoStatus
from app.models.conta_participante import ContaParticipante
from app.models.curso import CursoStatus
from app.models.participante import Participante
from app.repositories.certificado_repository import CertificadoRepository
from app.repositories.conta_participante_auditoria_repository import (
    ContaParticipanteAuditoriaRepository,
)
from app.repositories.conta_participante_password_reset_repository import (
    ContaParticipantePasswordResetRepository,
)
from app.repositories.conta_participante_repository import ContaParticipanteRepository
from app.repositories.inscricao_repository import InscricaoRepository
from app.repositories.participante_repository import ParticipanteRepository
from app.schemas.auth import AlterarSenhaRequest, TokenResponse
from app.schemas.conta_participante import (
    ContaParticipanteCadastrarRequest,
    ContaParticipanteAtualizarPerfilRequest,
    ContaParticipanteInscricaoItem,
    ContaParticipanteResponse,
)
from app.services.email_service import EmailService


RESET_TOKEN_TTL = timedelta(hours=1)


def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class ContaParticipanteService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._contas = ContaParticipanteRepository(session)
        self._participantes = ParticipanteRepository(session)
        self._inscricoes = InscricaoRepository(session)
        self._certificados = CertificadoRepository(session)
        self._auditoria = ContaParticipanteAuditoriaRepository(session)
        self._resets = ContaParticipantePasswordResetRepository(session)
        self._email = EmailService()

    @staticmethod
    def to_response(conta: ContaParticipante) -> ContaParticipanteResponse:
        return ContaParticipanteResponse.model_validate(conta)

    async def get_conta_by_id(self, conta_id: UUID) -> ContaParticipante:
        conta = await self._contas.get_by_id(conta_id)
        if conta is None or not conta.is_active:
            raise UnauthorizedError("Conta inválida ou inativa")
        return conta

    async def cadastrar(self, data: ContaParticipanteCadastrarRequest) -> TokenResponse:
        existing = await self._contas.get_by_documento(data.documento)
        if existing is not None:
            raise ConflictError("Já existe uma conta para este CPF")

        email = str(data.email).lower()
        email_taken = await self._contas.get_by_email(email)
        if email_taken is not None:
            raise ConflictError("E-mail já está em uso")

        participantes = await self._match_participantes(
            documento=data.documento,
            data_nascimento=data.data_nascimento,
            email=email,
        )
        if not participantes:
            raise NotFoundError("Não encontramos um cadastro com esses dados")

        nome = (data.nome or "").strip() or participantes[0].nome
        conta = await self._contas.create(
            nome=nome,
            email=email,
            documento=data.documento,
            data_nascimento=data.data_nascimento,
            hashed_password=hash_password(data.senha),
        )
        await self._session.commit()
        await self._session.refresh(conta)
        return self._token_for(conta)

    async def login(self, documento: str, senha: str) -> TokenResponse:
        try:
            cpf = normalize_cpf(documento)
        except ValueError as exc:
            raise UnauthorizedError() from exc

        conta = await self._contas.get_by_documento(cpf)
        if conta is None or not conta.is_active:
            raise UnauthorizedError()
        if not verify_password(senha, conta.hashed_password):
            raise UnauthorizedError()
        return self._token_for(conta)

    async def alterar_senha(
        self,
        conta: ContaParticipante,
        body: AlterarSenhaRequest,
        *,
        ip: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        if not verify_password(body.senha_atual, conta.hashed_password):
            raise UnauthorizedError("Senha atual inválida")
        if body.senha_atual == body.senha_nova:
            raise AppError("A nova senha deve ser diferente da atual")
        conta.hashed_password = hash_password(body.senha_nova)
        await self._contas.save(conta)
        await self._resets.invalidate_unused_for_account(conta.id)
        await self._auditoria.create(
            conta_participante_id=conta.id,
            acao="senha_alterada",
            ip=ip,
            user_agent=user_agent,
        )
        await self._session.commit()

    async def atualizar_perfil(
        self,
        conta: ContaParticipante,
        body: ContaParticipanteAtualizarPerfilRequest,
        *,
        ip: str | None = None,
        user_agent: str | None = None,
    ) -> ContaParticipanteResponse:
        if not verify_password(body.senha_atual, conta.hashed_password):
            raise UnauthorizedError("Senha atual inválida")

        participantes = await self._participantes.list_by_documento(conta.documento)
        novo_email = str(body.email).lower() if body.email is not None else conta.email
        alteracoes: dict[str, object] = {}

        if novo_email != conta.email:
            email_taken = await self._contas.get_by_email(novo_email)
            if email_taken is not None and email_taken.id != conta.id:
                raise ConflictError("E-mail já está em uso")
            for participante in participantes:
                conflict = await self._participantes.find_conflict(
                    instituicao_id=participante.instituicao_id,
                    email=novo_email,
                    documento=conta.documento,
                    exclude_id=participante.id,
                )
                if conflict is not None:
                    raise ConflictError(
                        "E-mail já cadastrado para outro participante em uma instituição"
                    )
            alteracoes["email"] = {"de": conta.email, "para": novo_email}

        if (
            body.data_nascimento is not None
            and body.data_nascimento != conta.data_nascimento
        ):
            alteracoes["data_nascimento"] = {
                "de": (
                    conta.data_nascimento.isoformat()
                    if conta.data_nascimento is not None
                    else None
                ),
                "para": body.data_nascimento.isoformat(),
            }

        if not alteracoes:
            raise AppError("Nenhuma alteração foi informada")

        if "email" in alteracoes:
            conta.email = novo_email
            for participante in participantes:
                participante.email = novo_email
        if "data_nascimento" in alteracoes:
            conta.data_nascimento = body.data_nascimento
            for participante in participantes:
                participante.data_nascimento = body.data_nascimento

        await self._contas.save(conta)
        alteracoes["cadastros_sincronizados"] = len(participantes)
        await self._auditoria.create(
            conta_participante_id=conta.id,
            acao="perfil_atualizado",
            detalhes=alteracoes,
            ip=ip,
            user_agent=user_agent,
        )
        await self._session.commit()
        await self._session.refresh(conta)
        return self.to_response(conta)

    async def solicitar_recuperacao(
        self,
        email: str,
        *,
        ip: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        conta = await self._contas.get_by_email(email)
        if conta is None or not conta.is_active:
            return

        await self._resets.invalidate_unused_for_account(conta.id)
        raw_token = secrets.token_urlsafe(32)
        await self._resets.create(
            conta_participante_id=conta.id,
            token_hash=_hash_reset_token(raw_token),
            expires_at=datetime.now(timezone.utc) + RESET_TOKEN_TTL,
        )
        await self._auditoria.create(
            conta_participante_id=conta.id,
            acao="recuperacao_solicitada",
            ip=ip,
            user_agent=user_agent,
        )
        await self._session.commit()

        base = get_settings().public_app_url.rstrip("/")
        link = f"{base}/minhas-inscricoes/redefinir?token={raw_token}"
        await self._email.send_password_reset(
            to=conta.email,
            nome=conta.nome,
            link=link,
        )

    async def redefinir_senha(
        self,
        token: str,
        senha_nova: str,
        *,
        ip: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        record = await self._resets.get_by_token_hash(
            _hash_reset_token(token.strip())
        )
        now = datetime.now(timezone.utc)
        if (
            record is None
            or record.used_at is not None
            or record.expires_at <= now
        ):
            raise AppError("Link de recuperação inválido ou expirado")

        conta = await self._contas.get_by_id(record.conta_participante_id)
        if conta is None or not conta.is_active:
            raise AppError("Link de recuperação inválido ou expirado")

        conta.hashed_password = hash_password(senha_nova)
        record.used_at = now
        await self._contas.save(conta)
        await self._auditoria.create(
            conta_participante_id=conta.id,
            acao="senha_redefinida",
            ip=ip,
            user_agent=user_agent,
        )
        await self._session.commit()

    async def create_if_absent(
        self,
        *,
        nome: str,
        email: str,
        documento: str,
        senha: str,
        data_nascimento: date | None = None,
    ) -> ContaParticipante | None:
        """Cria conta na inscrição pública se o CPF ainda não tiver acesso."""
        existing = await self._contas.get_by_documento(documento)
        if existing is not None:
            return None

        email_norm = email.lower()
        email_taken = await self._contas.get_by_email(email_norm)
        if email_taken is not None:
            raise ConflictError("E-mail já está em uso em outra conta")

        return await self._contas.create(
            nome=nome.strip(),
            email=email_norm,
            documento=documento,
            data_nascimento=data_nascimento,
            hashed_password=hash_password(senha),
        )

    async def list_inscricoes(
        self,
        conta: ContaParticipante,
    ) -> list[ContaParticipanteInscricaoItem]:
        participantes = await self._participantes.list_by_documento(conta.documento)
        participante_ids = [item.id for item in participantes]
        inscricoes = await self._inscricoes.list_by_participante_ids(participante_ids)
        certificados = await self._certificados.list_by_participante_ids(participante_ids)
        cert_by_pair: dict[tuple[UUID, UUID], Certificado] = {}
        for item in certificados:
            key = (item.participante_id, item.curso_id)
            current = cert_by_pair.get(key)
            if current is None:
                cert_by_pair[key] = item
            elif (
                item.status == CertificadoStatus.ACTIVE
                and current.status != CertificadoStatus.ACTIVE
            ):
                cert_by_pair[key] = item

        items: list[ContaParticipanteInscricaoItem] = []
        for inscricao in inscricoes:
            curso = inscricao.curso
            instituicao_nome = (
                curso.instituicao.nome if curso.instituicao is not None else ""
            )
            certificado = cert_by_pair.get((inscricao.participante_id, inscricao.curso_id))
            ja_emitido = (
                certificado is not None
                and certificado.status == CertificadoStatus.ACTIVE
            )
            pode_cancelar = (
                not inscricao.cancelada
                and curso.status not in {CursoStatus.COMPLETED, CursoStatus.CANCELLED}
                and not ja_emitido
            )
            items.append(
                ContaParticipanteInscricaoItem(
                    id=inscricao.id,
                    curso_id=curso.id,
                    curso_titulo=curso.titulo,
                    instituicao_nome=instituicao_nome,
                    data_evento=curso.data_evento,
                    curso_status=curso.status,
                    inscrito_em=inscricao.created_at,
                    pode_cancelar=pode_cancelar,
                    ja_emitido=ja_emitido or certificado is not None,
                    certificado_id=certificado.id if certificado else None,
                    certificado_status=certificado.status if certificado else None,
                    codigo_validacao=(
                        certificado.codigo_validacao if certificado else None
                    ),
                    numero_certificado=(
                        certificado.numero_certificado if certificado else None
                    ),
                    inscricao_cancelada=inscricao.cancelada,
                    cancelada_justificativa=inscricao.cancelada_justificativa,
                )
            )
        return items

    async def cancelar_inscricao(
        self,
        conta: ContaParticipante,
        inscricao_id: UUID,
    ) -> None:
        inscricao = await self._inscricoes.get_by_id(inscricao_id)
        if inscricao is None:
            raise NotFoundError("Inscrição não encontrada")

        participante = inscricao.participante
        if participante is None or participante.documento != conta.documento:
            raise ForbiddenError("Inscrição não pertence a esta conta")

        curso = inscricao.curso
        if inscricao.cancelada:
            raise ConflictError("Inscrição já está cancelada")
        if curso.status in {CursoStatus.COMPLETED, CursoStatus.CANCELLED}:
            raise AppError("Não é possível sair de um evento já concluído ou cancelado")

        certificado = await self._certificados.get_active_by_participante_curso(
            instituicao_id=inscricao.instituicao_id,
            participante_id=inscricao.participante_id,
            curso_id=inscricao.curso_id,
        )
        if certificado is not None:
            raise AppError("Não é possível cancelar uma inscrição com certificado emitido")

        inscricao.cancelada = True
        inscricao.cancelada_em = datetime.now(timezone.utc)
        inscricao.cancelada_justificativa = None
        await self._session.commit()

    async def _match_participantes(
        self,
        *,
        documento: str,
        data_nascimento,
        email: str,
    ) -> list[Participante]:
        candidatos = await self._participantes.list_by_documento_and_nascimento(
            documento,
            data_nascimento,
        )
        return [item for item in candidatos if item.email.lower() == email]

    @staticmethod
    def _token_for(conta: ContaParticipante) -> TokenResponse:
        token = create_participante_access_token(
            subject=conta.id,
            email=conta.email,
        )
        return TokenResponse(access_token=token)
