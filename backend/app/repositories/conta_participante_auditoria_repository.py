from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conta_participante_auditoria import ContaParticipanteAuditoria


class ContaParticipanteAuditoriaRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        *,
        conta_participante_id: UUID,
        acao: str,
        detalhes: dict[str, object] | None = None,
        ip: str | None = None,
        user_agent: str | None = None,
    ) -> ContaParticipanteAuditoria:
        registro = ContaParticipanteAuditoria(
            conta_participante_id=conta_participante_id,
            acao=acao,
            detalhes=detalhes or {},
            ip=ip,
            user_agent=user_agent,
        )
        self._session.add(registro)
        await self._session.flush()
        return registro
