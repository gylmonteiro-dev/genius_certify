from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.certificado import CertificadoStatus


class CertificadoEmitRequest(BaseModel):
    participante_id: UUID
    curso_id: UUID
    # Obrigatório para SuperAdmin; admin da instituição usa o JWT
    instituicao_id: UUID | None = None


class CertificadoEmitLoteRequest(BaseModel):
    curso_id: UUID
    participante_ids: list[UUID] = Field(min_length=1, max_length=200)
    instituicao_id: UUID | None = None


class CertificadoEmitLoteErro(BaseModel):
    participante_id: UUID
    mensagem: str


class CertificadoRevokeRequest(BaseModel):
    motivo: str | None = Field(default=None, max_length=500)


class CertificadoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    codigo_validacao: UUID
    instituicao_id: UUID
    curso_id: UUID
    participante_id: UUID
    numero_certificado: str
    participante_nome: str
    curso_titulo: str
    instituicao_nome: str
    carga_horaria: int
    instrutor: str
    template_id: str
    sha256: str | None
    status: CertificadoStatus
    created_at: datetime
    updated_at: datetime


class CertificadoEmitLoteResponse(BaseModel):
    emitidos: list[CertificadoResponse]
    erros: list[CertificadoEmitLoteErro]


class CertificadoPublicResponse(BaseModel):
    """Dados seguros para validação pública (sem IDs internos sensíveis demais)."""

    valido: bool
    codigo_validacao: UUID
    numero_certificado: str | None = None
    participante_nome: str | None = None
    curso_titulo: str | None = None
    instituicao_nome: str | None = None
    carga_horaria: int | None = None
    instrutor: str | None = None
    status: CertificadoStatus | None = None
    emitido_em: datetime | None = None
    mensagem: str


class CertificadoTemplateItem(BaseModel):
    id: str


class CertificadoPreviewRequest(BaseModel):
    participante_nome: str = "Nome do Participante"
    curso_titulo: str = "Nome do evento"
    instituicao_nome: str = ""
    carga_horaria: int = Field(default=0, ge=0)
    instrutor: str = ""
    instituicao_id: UUID | None = None
    frente_tipo: str | None = None
    frente_titulo: str | None = None
    frente_atestacao: str | None = None
    verso_parcerias: str | None = None
    verso_conteudos: str | None = None
    verso_observacoes: str | None = None
