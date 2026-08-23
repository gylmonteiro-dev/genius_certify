from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.cpf import normalize_cpf
from app.core.data_nascimento import validate_data_nascimento
from app.models.curso import CursoStatus
from app.models.participante import ParticipanteStatus


class ParticipanteCreate(BaseModel):
    nome: str = Field(min_length=2, max_length=255)
    email: EmailStr
    documento: str = Field(min_length=11, max_length=18)
    data_nascimento: date
    status: ParticipanteStatus = ParticipanteStatus.PENDING
    instituicao_id: UUID | None = None

    @field_validator("documento")
    @classmethod
    def validate_documento(cls, value: str) -> str:
        return normalize_cpf(value)

    @field_validator("data_nascimento")
    @classmethod
    def validate_nascimento(cls, value: date) -> date:
        return validate_data_nascimento(value)


class ParticipanteUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=255)
    email: EmailStr | None = None
    documento: str | None = Field(default=None, min_length=11, max_length=18)
    data_nascimento: date | None = None
    status: ParticipanteStatus | None = None

    @field_validator("documento")
    @classmethod
    def validate_documento(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_cpf(value)

    @field_validator("data_nascimento")
    @classmethod
    def validate_nascimento(cls, value: date | None) -> date | None:
        if value is None:
            return None
        return validate_data_nascimento(value)


class ParticipanteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    instituicao_id: UUID
    nome: str
    email: EmailStr
    documento: str
    data_nascimento: date | None = None
    status: ParticipanteStatus
    created_at: datetime
    updated_at: datetime


class ParticipanteEventoResponse(BaseModel):
    curso_id: UUID
    curso_titulo: str
    data_evento: date | None = None
    curso_status: CursoStatus
    inscrito_em: datetime
    ja_emitido: bool
    certificado_id: UUID | None = None
    numero_certificado: str | None = None


class ParticipanteDetalheResponse(ParticipanteResponse):
    eventos: list[ParticipanteEventoResponse]


class ParticipanteImportError(BaseModel):
    linha: int
    mensagem: str


class ParticipanteImportResponse(BaseModel):
    created: int
    skipped: int
    reused: int = 0
    errors: list[ParticipanteImportError]


class ConsultaCertificadosRequest(BaseModel):
    documento: str = Field(min_length=11, max_length=18)
    data_nascimento: date


class ConsultaCertificadoItem(BaseModel):
    codigo_validacao: UUID
    numero_certificado: str
    curso_titulo: str
    instituicao_nome: str
    carga_horaria: int
    instrutor: str
    emitido_em: datetime


class ConsultaCertificadosResponse(BaseModel):
    nome: str
    certificados: list[ConsultaCertificadoItem]
