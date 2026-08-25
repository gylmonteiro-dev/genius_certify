from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cpf import normalize_cpf
from app.core.exceptions import AppError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError
from app.core.security import (
    create_participante_access_token,
    hash_password,
    verify_password,
)
from app.models.conta_participante import ContaParticipante
from app.models.curso import CursoStatus
from app.models.participante import Participante
from app.repositories.certificado_repository import CertificadoRepository
from app.repositories.conta_participante_repository import ContaParticipanteRepository
from app.repositories.inscricao_repository import InscricaoRepository
from app.repositories.participante_repository import ParticipanteRepository
from app.schemas.auth import AlterarSenhaRequest, TokenResponse
from app.schemas.conta_participante import (
    ContaParticipanteCadastrarRequest,
    ContaParticipanteInscricaoItem,
    ContaParticipanteResponse,
)


class ContaParticipanteService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._contas = ContaParticipanteRepository(session)
        self._participantes = ParticipanteRepository(session)
        self._inscricoes = InscricaoRepository(session)
        self._certificados = CertificadoRepository(session)

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
    ) -> None:
        if not verify_password(body.senha_atual, conta.hashed_password):
            raise UnauthorizedError("Senha atual inválida")
        if body.senha_atual == body.senha_nova:
            raise AppError("A nova senha deve ser diferente da atual")
        conta.hashed_password = hash_password(body.senha_nova)
        await self._contas.save(conta)
        await self._session.commit()

    async def create_if_absent(
        self,
        *,
        nome: str,
        email: str,
        documento: str,
        senha: str,
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
            hashed_password=hash_password(senha),
        )

    async def list_inscricoes(
        self,
        conta: ContaParticipante,
    ) -> list[ContaParticipanteInscricaoItem]:
        participantes = await self._participantes.list_by_documento(conta.documento)
        participante_ids = [item.id for item in participantes]
        inscricoes = await self._inscricoes.list_by_participante_ids(participante_ids)
        certificados = await self._certificados.list_ativos_by_participante_ids(
            participante_ids
        )
        cert_by_pair = {
            (item.participante_id, item.curso_id): item for item in certificados
        }

        items: list[ContaParticipanteInscricaoItem] = []
        for inscricao in inscricoes:
            curso = inscricao.curso
            instituicao_nome = (
                curso.instituicao.nome if curso.instituicao is not None else ""
            )
            certificado = cert_by_pair.get((inscricao.participante_id, inscricao.curso_id))
            ja_emitido = certificado is not None
            pode_cancelar = (
                curso.status != CursoStatus.COMPLETED and not ja_emitido
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
                    ja_emitido=ja_emitido,
                    certificado_id=certificado.id if certificado else None,
                    codigo_validacao=(
                        certificado.codigo_validacao if certificado else None
                    ),
                    numero_certificado=(
                        certificado.numero_certificado if certificado else None
                    ),
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
        if curso.status == CursoStatus.COMPLETED:
            raise AppError("Não é possível sair de um evento já concluído")

        certificado = await self._certificados.get_active_by_participante_curso(
            instituicao_id=inscricao.instituicao_id,
            participante_id=inscricao.participante_id,
            curso_id=inscricao.curso_id,
        )
        if certificado is not None:
            raise AppError("Não é possível cancelar uma inscrição com certificado emitido")

        await self._inscricoes.delete(inscricao)
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
