from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.catalogo_evento import CatalogoEventoKind


class CatalogoEventoItemCreate(BaseModel):
    kind: CatalogoEventoKind
    nome: str = Field(min_length=2, max_length=128)
    nome_en: str = Field(default="", max_length=128)
    slug: str | None = Field(default=None, max_length=64)
    ordem: int | None = Field(default=None, ge=0, le=10_000)
    ativo: bool = True


class CatalogoEventoItemUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=128)
    nome_en: str | None = Field(default=None, max_length=128)
    ordem: int | None = Field(default=None, ge=0, le=10_000)
    ativo: bool | None = None


class CatalogoEventoItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    kind: CatalogoEventoKind
    slug: str
    nome: str
    nome_en: str
    ativo: bool
    ordem: int
    created_at: datetime
    updated_at: datetime
