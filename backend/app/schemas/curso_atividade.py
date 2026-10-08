from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.curso_atividade import AtividadeStatus, AtividadeTipo, InscricaoAtividadeStatus
from app.models.curso_colaborador import ColaboradorFuncao


class AtividadeResponsavelResponse(BaseModel):
    colaborador_id: UUID
    nome: str
    funcao: ColaboradorFuncao
    funcao_personalizada: str | None = None
    ordem: int


class AtividadeCreate(BaseModel):
    titulo: str = Field(min_length=1, max_length=255)
    descricao: str = ""
    tipo: AtividadeTipo
    tipo_personalizado: str | None = Field(default=None, max_length=80)
    data: date
    hora_inicio: time | None = None
    hora_fim: time | None = None
    carga_horaria: int | None = Field(default=None, ge=1)
    local: str | None = Field(default=None, max_length=180)
    limite_participantes: int | None = Field(default=None, ge=1)
    status: AtividadeStatus = AtividadeStatus.ATIVA
    ordem: int = Field(default=0, ge=0)
    colaborador_ids: list[UUID] = Field(default_factory=list, max_length=20)

    @field_validator("titulo", "tipo_personalizado", "local")
    @classmethod
    def _strip(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class AtividadeUpdate(BaseModel):
    titulo: str | None = Field(default=None, min_length=1, max_length=255)
    descricao: str | None = None
    tipo: AtividadeTipo | None = None
    tipo_personalizado: str | None = Field(default=None, max_length=80)
    data: date | None = None
    hora_inicio: time | None = None
    hora_fim: time | None = None
    carga_horaria: int | None = Field(default=None, ge=1)
    local: str | None = Field(default=None, max_length=180)
    limite_participantes: int | None = Field(default=None, ge=1)
    status: AtividadeStatus | None = None
    ordem: int | None = Field(default=None, ge=0)
    colaborador_ids: list[UUID] | None = Field(default=None, max_length=20)

    @field_validator("titulo", "tipo_personalizado", "local")
    @classmethod
    def _strip(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class AtividadeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    instituicao_id: UUID
    curso_id: UUID
    titulo: str
    descricao: str
    tipo: AtividadeTipo
    tipo_personalizado: str | None = None
    data: date
    hora_inicio: time | None = None
    hora_fim: time | None = None
    carga_horaria: int | None = None
    local: str | None = None
    limite_participantes: int | None = None
    status: AtividadeStatus
    ordem: int
    vagas_ocupadas: int = 0
    vagas_disponiveis: int | None = None
    lotada: bool = False
    responsaveis: list[AtividadeResponsavelResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class AtividadePublicResponse(BaseModel):
    id: UUID
    titulo: str
    descricao: str
    tipo: AtividadeTipo
    tipo_personalizado: str | None = None
    data: date
    hora_inicio: time | None = None
    hora_fim: time | None = None
    carga_horaria: int | None = None
    local: str | None = None
    limite_participantes: int | None = None
    vagas_ocupadas: int = 0
    vagas_disponiveis: int | None = None
    lotada: bool = False
    responsaveis: list[AtividadeResponsavelResponse] = Field(default_factory=list)


class AtividadeParticipanteItem(AtividadePublicResponse):
    selecionada: bool = False
    status_participacao: InscricaoAtividadeStatus | None = None


class AtividadesParticipanteResponse(BaseModel):
    permite_varias_atividades: bool
    atividade_obrigatoria: bool
    permitir_selecao_participante: bool
    selecao_atividades_ate: datetime | None = None
    pode_alterar: bool
    atividades: list[AtividadeParticipanteItem] = Field(default_factory=list)


class SelecionarAtividadesRequest(BaseModel):
    atividade_ids: list[UUID] = Field(default_factory=list, max_length=20)


class AtribuirAtividadesRequest(BaseModel):
    atividade_ids: list[UUID] = Field(default_factory=list, max_length=20)


class PresencaAtividadeRequest(BaseModel):
    participante_id: UUID
    status: InscricaoAtividadeStatus

    @field_validator("status")
    @classmethod
    def somente_presenca(cls, value: InscricaoAtividadeStatus) -> InscricaoAtividadeStatus:
        if value not in {InscricaoAtividadeStatus.PRESENTE, InscricaoAtividadeStatus.AUSENTE}:
            raise ValueError("Informe presente ou ausente")
        return value


class AtividadeInscritoResponse(BaseModel):
    participante_id: UUID
    nome: str
    email: str
    documento: str
    status: InscricaoAtividadeStatus
    selecionada_em: datetime
    certificado_habilitado: bool


class InscritoAtividadeResumo(BaseModel):
    atividade_id: UUID
    titulo: str
    status: InscricaoAtividadeStatus
