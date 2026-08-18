import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import get_settings
from app.core.exceptions import AppError
from app.seed.superadmin import seed_superadmin

logger = logging.getLogger(__name__)
_settings = get_settings()
_docs_enabled = not _settings.is_production


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    await seed_superadmin()
    try:
        from app.services.storage_service import get_storage_service

        get_storage_service().ensure_bucket()
        logger.info("Storage MinIO/S3 pronto")
    except Exception:
        logger.exception("Falha ao preparar bucket MinIO/S3 (uploads podem falhar)")
    yield


app = FastAPI(
    title="Nexus Genius Certify API",
    version="0.1.0",
    docs_url="/api/docs" if _docs_enabled else None,
    openapi_url="/api/openapi.json" if _docs_enabled else None,
    redoc_url="/api/redoc" if _docs_enabled else None,
    lifespan=lifespan,
)


@app.exception_handler(AppError)
async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    headers = {"WWW-Authenticate": "Bearer"} if exc.status_code == 401 else None
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message},
        headers=headers,
    )


app.include_router(api_router)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
