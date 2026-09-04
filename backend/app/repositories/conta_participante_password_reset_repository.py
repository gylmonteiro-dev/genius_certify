from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conta_participante_password_reset_token import (
    ContaParticipantePasswordResetToken,
)


class ContaParticipantePasswordResetRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_token_hash(
        self,
        token_hash: str,
    ) -> ContaParticipantePasswordResetToken | None:
        result = await self._session.execute(
            select(ContaParticipantePasswordResetToken).where(
                ContaParticipantePasswordResetToken.token_hash == token_hash
            )
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        *,
        conta_participante_id: UUID,
        token_hash: str,
        expires_at: datetime,
    ) -> ContaParticipantePasswordResetToken:
        token = ContaParticipantePasswordResetToken(
            conta_participante_id=conta_participante_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self._session.add(token)
        await self._session.flush()
        return token

    async def invalidate_unused_for_account(
        self,
        conta_participante_id: UUID,
    ) -> None:
        await self._session.execute(
            update(ContaParticipantePasswordResetToken)
            .where(
                ContaParticipantePasswordResetToken.conta_participante_id
                == conta_participante_id,
                ContaParticipantePasswordResetToken.used_at.is_(None),
            )
            .values(used_at=datetime.now(timezone.utc))
        )
