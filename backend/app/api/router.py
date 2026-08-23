from fastapi import APIRouter

from app.api.v1 import auth, certificados, cursos, instituicoes, participantes, publico

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(instituicoes.router)
api_router.include_router(cursos.router)
api_router.include_router(participantes.router)
api_router.include_router(certificados.router)
api_router.include_router(publico.router)
