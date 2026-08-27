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


FRENTE_TIPO_CONCLUSAO = "conclusao"
FRENTE_TIPO_PARTICIPACAO = "participacao"
FRENTE_TIPOS = frozenset({FRENTE_TIPO_CONCLUSAO, FRENTE_TIPO_PARTICIPACAO})

FRENTE_PRESETS: dict[str, dict[str, str]] = {
    FRENTE_TIPO_CONCLUSAO: {
        "titulo": "Certificado de conclusão",
        "atestacao": "concluiu com êxito o curso",
    },
    FRENTE_TIPO_PARTICIPACAO: {
        "titulo": "Certificado de participação",
        "atestacao": "participou do evento",
    },
}

EXCELENCIA_CONCLUSAO_TITULO = "Certificado de Excelência"
EXCELENCIA_CONCLUSAO_ATESTACAO = "Concluiu com sucesso"


def resolve_frente_tipo(frente_tipo: str | None) -> str:
    if frente_tipo in FRENTE_TIPOS:
        return frente_tipo
    return FRENTE_TIPO_CONCLUSAO


def resolve_frente_copy(
    *,
    template_id: str | None = None,
    frente_tipo: str | None = None,
    frente_titulo: str | None = None,
    frente_atestacao: str | None = None,
) -> tuple[str, str, str]:
    tipo = resolve_frente_tipo(frente_tipo)
    presets = FRENTE_PRESETS[tipo]
    titulo = (frente_titulo or "").strip()
    atestacao = (frente_atestacao or "").strip()
    template = resolve_template_id(template_id)
    if not titulo:
        if template == "excelencia" and tipo == FRENTE_TIPO_CONCLUSAO:
            titulo = EXCELENCIA_CONCLUSAO_TITULO
        else:
            titulo = presets["titulo"]
    if not atestacao:
        if template == "excelencia" and tipo == FRENTE_TIPO_CONCLUSAO:
            atestacao = EXCELENCIA_CONCLUSAO_ATESTACAO
        else:
            atestacao = presets["atestacao"]
    return tipo, titulo, atestacao
