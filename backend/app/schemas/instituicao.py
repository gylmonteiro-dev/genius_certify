from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.instituicao import InstituicaoStatus


def _normalize_cnpj(value: str) -> str:
    digits = "".join(ch for ch in value if ch.isdigit())
    if len(digits) != 14:
        raise ValueError("CNPJ deve conter 14 dígitos")
    return digits


class InstituicaoCreate(BaseModel):
    nome: str = Field(min_length=2, max_length=255)
    codigo: str = Field(min_length=2, max_length=64)
    cnpj: str = Field(min_length=14, max_length=18)
    responsavel: str = Field(min_length=2, max_length=255)
    email: EmailStr
    endereco: str = ""
    telefone: str = Field(default="", max_length=32)
    status: InstituicaoStatus = InstituicaoStatus.PENDING_REVIEW
    # Admin inicial da instituição (opcional)
    admin_nome: str | None = Field(default=None, min_length=2, max_length=255)
    admin_email: EmailStr | None = None
    admin_password: str | None = Field(default=None, min_length=8, max_length=128)

    @field_validator("cnpj")
    @classmethod
    def validate_cnpj(cls, value: str) -> str:
        return _normalize_cnpj(value)

    @field_validator("codigo")
    @classmethod
    def validate_codigo(cls, value: str) -> str:
        return value.strip().upper()


class InstituicaoUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=255)
    codigo: str | None = Field(default=None, min_length=2, max_length=64)
    cnpj: str | None = Field(default=None, min_length=14, max_length=18)
    responsavel: str | None = Field(default=None, min_length=2, max_length=255)
    email: EmailStr | None = None
    endereco: str | None = None
    telefone: str | None = Field(default=None, max_length=32)
    logo_url: str | None = Field(default=None, max_length=512)
    assinatura_url: str | None = Field(default=None, max_length=512)
    status: InstituicaoStatus | None = None

    @field_validator("cnpj")
    @classmethod
    def validate_cnpj(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _normalize_cnpj(value)

    @field_validator("codigo")
    @classmethod
    def validate_codigo(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip().upper()


class InstituicaoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    nome: str
    codigo: str
    cnpj: str
    endereco: str
    responsavel: str
    email: EmailStr
    telefone: str
    logo_url: str | None
    assinatura_url: str | None
    status: InstituicaoStatus
    created_at: datetime
    updated_at: datetime
