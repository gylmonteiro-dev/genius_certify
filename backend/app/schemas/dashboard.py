from pydantic import BaseModel


class DashboardResumoResponse(BaseModel):
    eventos_total: int
    eventos_abertos: int
    eventos_cancelados: int
    eventos_rascunho: int
    eventos_concluidos: int
    certificados_emitidos: int
    certificados_validados: int
    certificados_revogados: int
    certificados_expirados: int
