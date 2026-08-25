from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.cpf import normalize_cpf
from app.core.data_nascimento import validate_data_nascimento
from app.models.curso import CursoStatus


class ContaParticipanteCadastrarRequest(BaseModel):
    documento: str = Field(min_length=11, max_length=18)
    data_nascimento: date
    email: EmailStr
    senha: str = Field(min_length=8, max_length=128)
    nome: str | None = Field(default=None, min_length=2, max_length=255)

    @field_validator("documento")
    @classmethod
    def validate_documento(cls, value: str) -> str:
        return normalize_cpf(value)

    @field_validator("data_nascimento")
    @classmethod
    def validate_nascimento(cls, value: date) -> date:
        return validate_data_nascimento(value)


class ContaParticipanteLoginRequest(BaseModel):
    documento: str = Field(min_length=11, max_length=18)
    senha: str = Field(min_length=8, max_length=128)

    @field_validator("documento")
    @classmethod
    def validate_documento(cls, value: str) -> str:
        return normalize_cpf(value)


class ContaParticipanteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    nome: str
    email: EmailStr
    documento: str
    is_active: bool


class ContaParticipanteInscricaoItem(BaseModel):
    id: UUID
    curso_id: UUID
    curso_titulo: str
    instituicao_nome: str
    data_evento: date | None = None
    curso_status: CursoStatus
    inscrito_em: datetime
    pode_cancelar: bool
    ja_emitido: bool
    certificado_id: UUID | None = None
    codigo_validacao: UUID | None = None
    numero_certificado: str | None = None
