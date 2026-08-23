from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.cpf import normalize_cpf
from app.core.data_nascimento import validate_data_nascimento
from app.models.certificado import CertificadoStatus
from app.models.curso import CursoCategoria, CursoModalidade, CursoStatus
from app.models.participante import ParticipanteStatus


class CursoCreate(BaseModel):
    titulo: str = Field(min_length=2, max_length=255)
    descricao: str = ""
    carga_horaria: int = Field(default=0, ge=0)
    instrutor: str = Field(default="", max_length=255)
    status: CursoStatus = CursoStatus.DRAFT
    data_evento: date | None = None
    categoria: CursoCategoria | None = None
    modalidade: CursoModalidade | None = None
    tipo: str | None = Field(default=None, max_length=64)
    exigir_conclusao_para_emitir: bool = True
    # Obrigatório para SuperAdmin; ignorado para admin da instituição (usa o JWT)
    instituicao_id: UUID | None = None


class CursoUpdate(BaseModel):
    titulo: str | None = Field(default=None, min_length=2, max_length=255)
    descricao: str | None = None
    carga_horaria: int | None = Field(default=None, ge=0)
    instrutor: str | None = Field(default=None, max_length=255)
    status: CursoStatus | None = None
    data_evento: date | None = None
    categoria: CursoCategoria | None = None
    modalidade: CursoModalidade | None = None
    tipo: str | None = Field(default=None, max_length=64)
    exigir_conclusao_para_emitir: bool | None = None


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
    categoria: CursoCategoria | None = None
    modalidade: CursoModalidade | None = None
    tipo: str | None = None
    exigir_conclusao_para_emitir: bool
    emissao_liberada: bool
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
    categoria: CursoCategoria | None = None
    modalidade: CursoModalidade | None = None
    tipo: str | None = None


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


class InscricaoPublicaRequest(BaseModel):
    nome: str = Field(min_length=2, max_length=255)
    email: EmailStr
    documento: str = Field(min_length=11, max_length=18)
    data_nascimento: date

    @field_validator("documento")
    @classmethod
    def validate_documento(cls, value: str) -> str:
        return normalize_cpf(value)

    @field_validator("data_nascimento")
    @classmethod
    def validate_nascimento(cls, value: date) -> date:
        return validate_data_nascimento(value)
