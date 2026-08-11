import logging

from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.services.auth_service import AuthService

logger = logging.getLogger(__name__)


async def seed_superadmin() -> None:
    settings = get_settings()
    async with AsyncSessionLocal() as session:
        usuario = await AuthService(session).ensure_superadmin(
            email=settings.superadmin_email,
            password=settings.superadmin_password,
            nome=settings.superadmin_nome,
        )
        logger.info("SuperAdmin pronto: %s (%s)", usuario.email, usuario.id)
