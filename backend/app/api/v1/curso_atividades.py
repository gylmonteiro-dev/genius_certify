from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import RequireInstituicaoAdmin
from app.models.usuario import Usuario
from app.schemas.curso_atividade import (
    AtividadeCreate,
    AtividadeInscritoResponse,
    AtividadeResponse,
    AtividadeUpdate,
    AtribuirAtividadesRequest,
    InscritoAtividadeResumo,
    PresencaAtividadeRequest,
)
from app.services.curso_atividade_service import CursoAtividadeService

router = APIRouter(prefix="/cursos", tags=["cursos"])


async def _tenant(
    service: CursoAtividadeService,
    curso_id: UUID,
    actor: Usuario,
) -> UUID:
    return await service.instituicao_do_curso(curso_id, actor)


@router.get("/{curso_id}/atividades", response_model=list[AtividadeResponse])
async def list_atividades(
    curso_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> list[AtividadeResponse]:
    service = CursoAtividadeService(session)
    instituicao_id = await _tenant(service, curso_id, current_user)
    return await service.list_admin(curso_id, instituicao_id=instituicao_id)


@router.post(
    "/{curso_id}/atividades",
    response_model=AtividadeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_atividade(
    curso_id: UUID,
    body: AtividadeCreate,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> AtividadeResponse:
    service = CursoAtividadeService(session)
    instituicao_id = await _tenant(service, curso_id, current_user)
    atividade = await service.create(curso_id, body, instituicao_id=instituicao_id)
    await session.commit()
    return atividade


@router.patch(
    "/{curso_id}/atividades/{atividade_id}",
    response_model=AtividadeResponse,
)
async def update_atividade(
    curso_id: UUID,
    atividade_id: UUID,
    body: AtividadeUpdate,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> AtividadeResponse:
    service = CursoAtividadeService(session)
    instituicao_id = await _tenant(service, curso_id, current_user)
    atividade = await service.update(
        curso_id,
        atividade_id,
        body,
        instituicao_id=instituicao_id,
    )
    await session.commit()
    return atividade


@router.post(
    "/{curso_id}/atividades/{atividade_id}/inativar",
    response_model=AtividadeResponse,
)
async def inativar_atividade(
    curso_id: UUID,
    atividade_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> AtividadeResponse:
    service = CursoAtividadeService(session)
    instituicao_id = await _tenant(service, curso_id, current_user)
    atividade = await service.inativar(
        curso_id,
        atividade_id,
        instituicao_id=instituicao_id,
    )
    await session.commit()
    return atividade


@router.post(
    "/{curso_id}/atividades/{atividade_id}/cancelar",
    response_model=AtividadeResponse,
)
async def cancelar_atividade(
    curso_id: UUID,
    atividade_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> AtividadeResponse:
    service = CursoAtividadeService(session)
    instituicao_id = await _tenant(service, curso_id, current_user)
    atividade = await service.cancelar(
        curso_id,
        atividade_id,
        instituicao_id=instituicao_id,
    )
    await session.commit()
    return atividade


@router.get(
    "/{curso_id}/atividades/{atividade_id}/inscritos",
    response_model=list[AtividadeInscritoResponse],
)
async def list_inscritos_atividade(
    curso_id: UUID,
    atividade_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> list[AtividadeInscritoResponse]:
    service = CursoAtividadeService(session)
    instituicao_id = await _tenant(service, curso_id, current_user)
    return await service.list_inscritos(
        curso_id,
        atividade_id,
        instituicao_id=instituicao_id,
    )


@router.post(
    "/{curso_id}/inscritos/{participante_id}/atividades",
    response_model=list[InscritoAtividadeResumo],
)
async def atribuir_atividades(
    curso_id: UUID,
    participante_id: UUID,
    body: AtribuirAtividadesRequest,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> list[InscritoAtividadeResumo]:
    service = CursoAtividadeService(session)
    instituicao_id = await _tenant(service, curso_id, current_user)
    resumos = await service.atribuir(
        curso_id,
        participante_id,
        body.atividade_ids,
        instituicao_id=instituicao_id,
    )
    await session.commit()
    return resumos


@router.delete(
    "/{curso_id}/inscritos/{participante_id}/atividades",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def cancelar_atividades_do_inscrito(
    curso_id: UUID,
    participante_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> Response:
    service = CursoAtividadeService(session)
    instituicao_id = await _tenant(service, curso_id, current_user)
    await service.atribuir(
        curso_id,
        participante_id,
        [],
        instituicao_id=instituicao_id,
    )
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{curso_id}/atividades/{atividade_id}/presenca",
    response_model=AtividadeInscritoResponse,
)
async def registrar_presenca(
    curso_id: UUID,
    atividade_id: UUID,
    body: PresencaAtividadeRequest,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> AtividadeInscritoResponse:
    service = CursoAtividadeService(session)
    instituicao_id = await _tenant(service, curso_id, current_user)
    resultado = await service.registrar_presenca(
        curso_id,
        atividade_id,
        instituicao_id=instituicao_id,
        participante_id=body.participante_id,
        status=body.status,
    )
    await session.commit()
    return resultado
