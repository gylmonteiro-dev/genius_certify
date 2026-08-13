from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.curso import CursoStatus


class CursoCreate(BaseModel):
    titulo: str = Field(min_length=2, max_length=255)
    descricao: str = ""
    carga_horaria: int = Field(default=0, ge=0)
    instrutor: str = Field(default="", max_length=255)
    status: CursoStatus = CursoStatus.DRAFT
    # Obrigatório para SuperAdmin; ignorado para admin da instituição (usa o JWT)
    instituicao_id: UUID | None = None


class CursoUpdate(BaseModel):
    titulo: str | None = Field(default=None, min_length=2, max_length=255)
    descricao: str | None = None
    carga_horaria: int | None = Field(default=None, ge=0)
    instrutor: str | None = Field(default=None, max_length=255)
    status: CursoStatus | None = None


class CursoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    instituicao_id: UUID
    titulo: str
    descricao: str
    carga_horaria: int
    instrutor: str
    status: CursoStatus
    created_at: datetime
    updated_at: datetime
