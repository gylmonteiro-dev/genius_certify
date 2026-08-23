from __future__ import annotations

import base64
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

from app.core.config import get_settings
from app.models.certificado import Certificado
from app.services.certificate_templates import resolve_template_filename
from app.services.storage_service import StorageService, get_storage_service

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"


@dataclass(frozen=True)
class CertificateRenderData:
    template_id: str | None
    participante_nome: str
    curso_titulo: str
    instituicao_nome: str
    carga_horaria: int
    instrutor: str
    numero_certificado: str
    codigo_validacao: str
    sha256: str
    emitido_em: str
    logo_url: str | None = None
    assinatura_url: str | None = None


class PdfService:
    def __init__(self, storage: StorageService | None = None) -> None:
        self._env = Environment(
            loader=FileSystemLoader(str(TEMPLATES_DIR)),
            autoescape=select_autoescape(["html", "xml"]),
        )
        self._storage = storage

    def _to_data_uri(self, url: str | None) -> str | None:
        if not url:
            return None
        storage = self._storage or get_storage_service()
        settings = get_settings()
        key = StorageService.key_from_public_url(
            url,
            bucket=settings.s3_bucket,
            public_base=storage.public_base_url,
        )
        if key is None:
            return None
        try:
            data, content_type = storage.download_bytes(key)
        except Exception:
            return None
        encoded = base64.b64encode(data).decode("ascii")
        return f"data:{content_type};base64,{encoded}"

    def _render_html(self, data: CertificateRenderData, *, font_base: str) -> str:
        template = self._env.get_template(resolve_template_filename(data.template_id))
        return template.render(
            participante_nome=data.participante_nome,
            curso_titulo=data.curso_titulo,
            instituicao_nome=data.instituicao_nome,
            carga_horaria=data.carga_horaria,
            instrutor=data.instrutor,
            numero_certificado=data.numero_certificado,
            codigo_validacao=data.codigo_validacao,
            sha256=data.sha256 or "",
            emitido_em=data.emitido_em,
            logo_data_uri=self._to_data_uri(data.logo_url),
            assinatura_data_uri=self._to_data_uri(data.assinatura_url),
            font_base=font_base,
        )

    def render_certificado_html(self, data: CertificateRenderData) -> str:
        return self._render_html(data, font_base="/api/publico/certificado-fonts/")

    def render_certificado_pdf(self, data: CertificateRenderData) -> bytes:
        html = self._render_html(data, font_base="fonts/")
        return HTML(string=html, base_url=str(TEMPLATES_DIR)).write_pdf()

    def data_from_certificado(
        self,
        certificado: Certificado,
        *,
        logo_url: str | None = None,
        assinatura_url: str | None = None,
    ) -> CertificateRenderData:
        return CertificateRenderData(
            template_id=certificado.template_id,
            participante_nome=certificado.participante_nome,
            curso_titulo=certificado.curso_titulo,
            instituicao_nome=certificado.instituicao_nome,
            carga_horaria=certificado.carga_horaria,
            instrutor=certificado.instrutor,
            numero_certificado=certificado.numero_certificado,
            codigo_validacao=str(certificado.codigo_validacao),
            sha256=certificado.sha256 or "",
            emitido_em=certificado.created_at.strftime("%d/%m/%Y"),
            logo_url=logo_url,
            assinatura_url=assinatura_url,
        )

    @staticmethod
    def preview_data(
        *,
        template_id: str,
        participante_nome: str,
        curso_titulo: str,
        instituicao_nome: str,
        carga_horaria: int,
        instrutor: str,
        logo_url: str | None = None,
        assinatura_url: str | None = None,
    ) -> CertificateRenderData:
        today = datetime.now().strftime("%d/%m/%Y")
        return CertificateRenderData(
            template_id=template_id,
            participante_nome=participante_nome,
            curso_titulo=curso_titulo,
            instituicao_nome=instituicao_nome,
            carga_horaria=carga_horaria,
            instrutor=instrutor,
            numero_certificado="CERT-PREVIEW",
            codigo_validacao="prévia",
            sha256="",
            emitido_em=today,
            logo_url=logo_url,
            assinatura_url=assinatura_url,
        )
