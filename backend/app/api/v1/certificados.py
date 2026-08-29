from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import HTMLResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import RequireInstituicaoAdmin
from app.models.usuario import Usuario
from app.schemas.certificado import (
    CertificadoEmitLoteRequest,
    CertificadoEmitLoteResponse,
    CertificadoEmitRequest,
    CertificadoPreviewRequest,
    CertificadoPublicResponse,
    CertificadoResponse,
    CertificadoTemplateItem,
)
from app.services.certificate_templates import list_templates
from app.services.certificado_service import CertificadoService

router = APIRouter(prefix="/certificados", tags=["certificados"])


@router.get("/templates", response_model=list[CertificadoTemplateItem])
async def list_certificate_templates(
    _current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> list[CertificadoTemplateItem]:
    return [CertificadoTemplateItem(id=item.id) for item in list_templates()]


@router.post("/templates/{template_id}/preview", response_class=HTMLResponse)
async def preview_certificate_template(
    template_id: str,
    body: CertificadoPreviewRequest,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> HTMLResponse:
    html = await CertificadoService(session).preview_html(
        actor=current_user,
        template_id=template_id,
        participante_nome=body.participante_nome,
        curso_titulo=body.curso_titulo,
        instituicao_nome=body.instituicao_nome,
        carga_horaria=body.carga_horaria,
        instrutor=body.instrutor,
        instituicao_id=body.instituicao_id,
        verso_parcerias=body.verso_parcerias,
        verso_conteudos=body.verso_conteudos,
        verso_observacoes=body.verso_observacoes,
        frente_tipo=body.frente_tipo,
        frente_titulo=body.frente_titulo,
        frente_atestacao=body.frente_atestacao,
        data_evento=body.data_evento,
    )
    return HTMLResponse(content=html)


@router.post(
    "/emitir",
    response_model=CertificadoResponse,
    status_code=status.HTTP_201_CREATED,
)
async def emitir_certificado(
    body: CertificadoEmitRequest,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> CertificadoResponse:
    return await CertificadoService(session).emitir(body, actor=current_user)


@router.post(
    "/emitir-lote",
    response_model=CertificadoEmitLoteResponse,
    status_code=status.HTTP_200_OK,
)
async def emitir_certificados_lote(
    body: CertificadoEmitLoteRequest,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> CertificadoEmitLoteResponse:
    return await CertificadoService(session).emitir_lote(body, actor=current_user)


@router.get("", response_model=list[CertificadoResponse])
async def list_certificados(
    instituicao_id: UUID | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> list[CertificadoResponse]:
    return await CertificadoService(session).list(
        actor=current_user,
        instituicao_id=instituicao_id,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/validar/{codigo_validacao}",
    response_model=CertificadoPublicResponse,
    tags=["validacao-publica"],
)
async def validar_certificado(
    codigo_validacao: UUID,
    session: AsyncSession = Depends(get_db),
) -> CertificadoPublicResponse:
    """Endpoint público — não requer autenticação."""
    return await CertificadoService(session).validar_publico(codigo_validacao)


@router.get("/{certificado_id}", response_model=CertificadoResponse)
async def get_certificado(
    certificado_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> CertificadoResponse:
    return await CertificadoService(session).get(certificado_id, actor=current_user)


@router.get("/{certificado_id}/html", response_class=HTMLResponse)
async def view_certificado_html(
    certificado_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> HTMLResponse:
    html = await CertificadoService(session).gerar_html(
        certificado_id,
        actor=current_user,
    )
    return HTMLResponse(content=html)


@router.get("/{certificado_id}/pdf")
async def download_certificado_pdf(
    certificado_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> Response:
    pdf_bytes, filename = await CertificadoService(session).gerar_pdf(
        certificado_id,
        actor=current_user,
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{certificado_id}/revogar", response_model=CertificadoResponse)
async def revogar_certificado(
    certificado_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(RequireInstituicaoAdmin),
) -> CertificadoResponse:
    return await CertificadoService(session).revogar(certificado_id, actor=current_user)
