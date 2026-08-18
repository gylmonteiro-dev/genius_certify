from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.usuario import UsuarioRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UsuarioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    nome: str
    email: EmailStr
    role: UsuarioRole
    instituicao_id: UUID | None
    is_active: bool


class AlterarSenhaRequest(BaseModel):
    senha_atual: str = Field(min_length=8, max_length=128)
    senha_nova: str = Field(min_length=8, max_length=128)
