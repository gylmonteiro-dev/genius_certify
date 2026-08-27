from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.cpf import normalize_cpf
from app.core.data_nascimento import validate_data_nascimento
from app.models.certificado import CertificadoStatus
from app.models.curso import CursoStatus
from app.models.participante import ParticipanteStatus


class CursoCreate(BaseModel):
    titulo: str = Field(min_length=2, max_length=255)
    descricao: str = ""
    carga_horaria: int = Field(default=0, ge=0)
    instrutor: str = Field(default="", max_length=255)
    status: CursoStatus = CursoStatus.DRAFT
    data_evento: date | None = None
    categoria: str | None = Field(default=None, max_length=64)
    modalidade: str | None = Field(default=None, max_length=64)
    tipo: str | None = Field(default=None, max_length=64)
    exigir_conclusao_para_emitir: bool = True
    template_id: str = "classic"
    verso_parcerias: str | None = None
    verso_conteudos: str | None = None
    verso_observacoes: str | None = None
    # Obrigatório para SuperAdmin; ignorado para admin da instituição (usa o JWT)
    instituicao_id: UUID | None = None


class CursoUpdate(BaseModel):
    titulo: str | None = Field(default=None, min_length=2, max_length=255)
    descricao: str | None = None
    carga_horaria: int | None = Field(default=None, ge=0)
    instrutor: str | None = Field(default=None, max_length=255)
    status: CursoStatus | None = None
    data_evento: date | None = None
    categoria: str | None = Field(default=None, max_length=64)
    modalidade: str | None = Field(default=None, max_length=64)
    tipo: str | None = Field(default=None, max_length=64)
    exigir_conclusao_para_emitir: bool | None = None
    template_id: str | None = None
    verso_parcerias: str | None = None
    verso_conteudos: str | None = None
    verso_observacoes: str | None = None


class CursoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    instituicao_id: UUID
    titulo: str
    descricao: str
    carga_horaria: int
    instrutor: str
    status: CursoStatus
    data_evento: date | None = None
    categoria: str | None = None
    modalidade: str | None = None
    tipo: str | None = None
    exigir_conclusao_para_emitir: bool
    emissao_liberada: bool
    template_id: str
    verso_parcerias: str | None = None
    verso_conteudos: str | None = None
    verso_observacoes: str | None = None
    cancelamento_justificativa: str | None = None
    cancelado_em: datetime | None = None
    created_at: datetime
    updated_at: datetime


class CursoPublicResponse(BaseModel):
    id: UUID
    titulo: str
    descricao: str
    carga_horaria: int
    instrutor: str
    status: CursoStatus
    instituicao_nome: str
    data_evento: date | None = None
    categoria: str | None = None
    modalidade: str | None = None
    tipo: str | None = None
    verso_parcerias: str | None = None
    verso_conteudos: str | None = None
    verso_observacoes: str | None = None


class InscritoResponse(BaseModel):
    id: UUID
    nome: str
    email: EmailStr
    documento: str
    status: ParticipanteStatus
    inscrito_em: datetime
    ja_emitido: bool
    certificado_id: UUID | None = None
    certificado_status: CertificadoStatus | None = None
    numero_certificado: str | None = None
    inscricao_cancelada: bool = False
    cancelada_justificativa: str | None = None


class InscricaoLoteRequest(BaseModel):
    participante_ids: list[UUID] = Field(min_length=1, max_length=200)


class InscricaoLoteErro(BaseModel):
    participante_id: UUID
    mensagem: str


class InscricaoLoteResponse(BaseModel):
    enrolled: int
    already_enrolled: int
    errors: list[InscricaoLoteErro]


class InscricaoPublicaRequest(BaseModel):
    nome: str = Field(min_length=2, max_length=255)
    email: EmailStr
    documento: str = Field(min_length=11, max_length=18)
    data_nascimento: date
    senha: str | None = Field(default=None, max_length=128)

    @field_validator("documento")
    @classmethod
    def validate_documento(cls, value: str) -> str:
        return normalize_cpf(value)

    @field_validator("data_nascimento")
    @classmethod
    def validate_nascimento(cls, value: date) -> date:
        return validate_data_nascimento(value)

    @field_validator("senha")
    @classmethod
    def validate_senha(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            return None
        if len(stripped) < 8:
            raise ValueError("Senha deve ter pelo menos 8 caracteres")
        return stripped


class RemoverInscritoRequest(BaseModel):
    revogar_certificado: bool = False
    justificativa: str | None = None


class CancelarCursoRequest(BaseModel):
    justificativa: str | None = None


class RevogarCertificadosLoteRequest(BaseModel):
    participante_ids: list[UUID] | None = None


class CancelarInscritosLoteRequest(BaseModel):
    participante_ids: list[UUID] = Field(min_length=1, max_length=200)
    justificativa: str | None = None
    revogar_certificados: bool = False


class LoteItemErro(BaseModel):
    participante_id: UUID
    mensagem: str


class RevogarCertificadosLoteResponse(BaseModel):
    revoked: int
    skipped: int
    errors: list[LoteItemErro]


class CancelarInscritosLoteResponse(BaseModel):
    cancelled: int
    skipped: int
    revoked: int
    errors: list[LoteItemErro]
