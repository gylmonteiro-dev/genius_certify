from __future__ import annotations

import base64
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

from app.core.config import get_settings
from app.models.certificado import Certificado
from app.services.certificate_templates import resolve_frente_copy, resolve_template_filename
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
    url_validacao: str = ""
    data_evento: str = ""
    logo_url: str | None = None
    assinatura_url: str | None = None
    frente_tipo: str | None = None
    frente_titulo: str | None = None
    frente_atestacao: str | None = None
    verso_parcerias: str | None = None
    verso_conteudos: str | None = None
    verso_observacoes: str | None = None


class PdfService:
    def __init__(self, storage: StorageService | None = None) -> None:
        self._env = Environment(
            loader=FileSystemLoader(str(TEMPLATES_DIR)),
            autoescape=select_autoescape(["html", "xml"]),
        )
        self._storage = storage

    @staticmethod
    def validation_url(codigo: str) -> str:
        base = get_settings().public_app_url.rstrip("/")
        return f"{base}/validar/{codigo}"

    @staticmethod
    def format_data_evento(value: date | None) -> str:
        if value is None:
            return ""
        return value.strftime("%d/%m/%Y")

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
        _tipo, frente_titulo, frente_atestacao = resolve_frente_copy(
            template_id=data.template_id,
            frente_tipo=data.frente_tipo,
            frente_titulo=data.frente_titulo,
            frente_atestacao=data.frente_atestacao,
        )
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
            url_validacao=data.url_validacao or self.validation_url(data.codigo_validacao),
            data_evento=data.data_evento,
            logo_data_uri=self._to_data_uri(data.logo_url),
            assinatura_data_uri=self._to_data_uri(data.assinatura_url),
            font_base=font_base,
            frente_titulo=frente_titulo,
            frente_atestacao=frente_atestacao,
            verso_parcerias=data.verso_parcerias or "",
            verso_conteudos=data.verso_conteudos or "",
            verso_observacoes=data.verso_observacoes or "",
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
        data_evento: date | None = None,
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
            url_validacao=self.validation_url(str(certificado.codigo_validacao)),
            data_evento=self.format_data_evento(data_evento),
            logo_url=logo_url,
            assinatura_url=assinatura_url,
            frente_tipo=certificado.frente_tipo,
            frente_titulo=certificado.frente_titulo,
            frente_atestacao=certificado.frente_atestacao,
            verso_parcerias=certificado.verso_parcerias,
            verso_conteudos=certificado.verso_conteudos,
            verso_observacoes=certificado.verso_observacoes,
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
        frente_tipo: str | None = None,
        frente_titulo: str | None = None,
        frente_atestacao: str | None = None,
        verso_parcerias: str | None = None,
        verso_conteudos: str | None = None,
        verso_observacoes: str | None = None,
        data_evento: date | None = None,
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
            url_validacao=PdfService.validation_url("prévia"),
            data_evento=PdfService.format_data_evento(data_evento),
            logo_url=logo_url,
            assinatura_url=assinatura_url,
            frente_tipo=frente_tipo,
            frente_titulo=frente_titulo,
            frente_atestacao=frente_atestacao,
            verso_parcerias=verso_parcerias,
            verso_conteudos=verso_conteudos,
            verso_observacoes=verso_observacoes,
        )
