from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CertificateTemplate:
    id: str
    filename: str


DEFAULT_TEMPLATE_ID = "classic"

TEMPLATES: dict[str, CertificateTemplate] = {
    "classic": CertificateTemplate(id="classic", filename="certificado.html"),
    "excelencia": CertificateTemplate(
        id="excelencia",
        filename="certificado_excelencia.html",
    ),
}


def is_valid_template_id(template_id: str) -> bool:
    return template_id in TEMPLATES


def resolve_template_id(template_id: str | None) -> str:
    if template_id and template_id in TEMPLATES:
        return template_id
    return DEFAULT_TEMPLATE_ID


def resolve_template_filename(template_id: str | None) -> str:
    return TEMPLATES[resolve_template_id(template_id)].filename


def list_templates() -> list[CertificateTemplate]:
    return list(TEMPLATES.values())
