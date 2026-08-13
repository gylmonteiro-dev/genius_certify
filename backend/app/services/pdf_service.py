from __future__ import annotations

import base64
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

from app.core.config import get_settings
from app.models.certificado import Certificado
from app.services.storage_service import StorageService, get_storage_service

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"


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

    def render_certificado_pdf(
        self,
        certificado: Certificado,
        *,
        logo_url: str | None = None,
        assinatura_url: str | None = None,
    ) -> bytes:
        template = self._env.get_template("certificado.html")
        html = template.render(
            aluno_nome=certificado.aluno_nome,
            curso_titulo=certificado.curso_titulo,
            instituicao_nome=certificado.instituicao_nome,
            carga_horaria=certificado.carga_horaria,
            instrutor=certificado.instrutor,
            numero_certificado=certificado.numero_certificado,
            codigo_validacao=str(certificado.codigo_validacao),
            sha256=certificado.sha256 or "",
            emitido_em=certificado.created_at.strftime("%d/%m/%Y"),
            logo_data_uri=self._to_data_uri(logo_url),
            assinatura_data_uri=self._to_data_uri(assinatura_url),
        )
        return HTML(string=html, base_url=str(TEMPLATES_DIR)).write_pdf()
