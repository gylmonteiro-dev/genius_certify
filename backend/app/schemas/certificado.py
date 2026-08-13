from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.certificado import CertificadoStatus


class CertificadoEmitRequest(BaseModel):
    aluno_id: UUID
    curso_id: UUID
    # Obrigatório para SuperAdmin; admin da instituição usa o JWT
    instituicao_id: UUID | None = None


class CertificadoRevokeRequest(BaseModel):
    motivo: str | None = Field(default=None, max_length=500)


class CertificadoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    codigo_validacao: UUID
    instituicao_id: UUID
    curso_id: UUID
    aluno_id: UUID
    numero_certificado: str
    aluno_nome: str
    curso_titulo: str
    instituicao_nome: str
    carga_horaria: int
    instrutor: str
    sha256: str | None
    status: CertificadoStatus
    created_at: datetime
    updated_at: datetime


class CertificadoPublicResponse(BaseModel):
    """Dados seguros para validação pública (sem IDs internos sensíveis demais)."""

    valido: bool
    codigo_validacao: UUID
    numero_certificado: str | None = None
    aluno_nome: str | None = None
    curso_titulo: str | None = None
    instituicao_nome: str | None = None
    carga_horaria: int | None = None
    instrutor: str | None = None
    status: CertificadoStatus | None = None
    emitido_em: datetime | None = None
    mensagem: str
