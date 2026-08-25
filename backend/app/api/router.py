from fastapi import APIRouter

from app.api.v1 import (
    auth,
    catalogo_eventos,
    certificados,
    cursos,
    instituicoes,
    participante,
    participantes,
    publico,
)

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(instituicoes.router)
api_router.include_router(catalogo_eventos.router)
api_router.include_router(cursos.router)
api_router.include_router(participantes.router)
api_router.include_router(participante.router)
api_router.include_router(certificados.router)
api_router.include_router(publico.router)
