from fastapi import APIRouter

from app.api.v1 import alunos, auth, certificados, cursos, instituicoes, publico

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(instituicoes.router)
api_router.include_router(cursos.router)
api_router.include_router(alunos.router)
api_router.include_router(certificados.router)
api_router.include_router(publico.router)
