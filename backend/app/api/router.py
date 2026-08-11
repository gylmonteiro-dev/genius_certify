from fastapi import APIRouter

from app.api.v1 import auth, instituicoes

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(instituicoes.router)
