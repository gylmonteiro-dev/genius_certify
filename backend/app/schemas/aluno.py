from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.aluno import AlunoStatus


def _normalize_documento(value: str) -> str:
    cleaned = "".join(ch for ch in value if ch.isalnum())
    if len(cleaned) < 5:
        raise ValueError("Documento inválido")
    return cleaned.upper()


class AlunoCreate(BaseModel):
    nome: str = Field(min_length=2, max_length=255)
    email: EmailStr
    documento: str = Field(min_length=5, max_length=64)
    status: AlunoStatus = AlunoStatus.PENDING
    # Obrigatório para SuperAdmin; ignorado para admin da instituição (usa o JWT)
    instituicao_id: UUID | None = None

    @field_validator("documento")
    @classmethod
    def validate_documento(cls, value: str) -> str:
        return _normalize_documento(value)


class AlunoUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=255)
    email: EmailStr | None = None
    documento: str | None = Field(default=None, min_length=5, max_length=64)
    status: AlunoStatus | None = None

    @field_validator("documento")
    @classmethod
    def validate_documento(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _normalize_documento(value)


class AlunoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    instituicao_id: UUID
    nome: str
    email: EmailStr
    documento: str
    status: AlunoStatus
    created_at: datetime
    updated_at: datetime


class AlunoImportError(BaseModel):
    linha: int
    mensagem: str


class AlunoImportResponse(BaseModel):
    created: int
    skipped: int
    errors: list[AlunoImportError]
