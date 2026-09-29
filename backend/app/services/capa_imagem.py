"""Validação e conversão da capa de evento.

O arquivo original não é armazenado. A saída são dois WebP já recortados
em 16:9, sem EXIF nem outros metadados.
"""

from __future__ import annotations

import threading
import warnings
from dataclasses import dataclass
from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError
from PIL.Image import DecompressionBombError, DecompressionBombWarning

from app.core.exceptions import AppError

MAX_CAPA_BYTES = 5 * 1024 * 1024
MAX_CAPA_PIXELS = 20_000_000
MIN_CAPA_WIDTH = 800
MIN_CAPA_HEIGHT = 450
DETAIL_SIZE = (1440, 810)
CARD_SIZE = (640, 360)
DETAIL_QUALITY = 82
CARD_QUALITY = 78

_ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
_MIME_FORMAT = {
    "image/jpeg": "JPEG",
    "image/jpg": "JPEG",
    "image/pjpeg": "JPEG",
    "image/png": "PNG",
    "image/webp": "WEBP",
}
_EXTENSION_FORMAT = {
    "jpg": "JPEG",
    "jpeg": "JPEG",
    "png": "PNG",
    "webp": "WEBP",
}
_image_lock = threading.Lock()


@dataclass(frozen=True)
class CapaProcessada:
    card: bytes
    detail: bytes
    foco_x: float
    foco_y: float


def processar_capa(
    data: bytes,
    *,
    filename: str | None,
    content_type: str | None,
    foco_x: float | None,
    foco_y: float | None,
) -> CapaProcessada:
    if not data:
        raise AppError("Arquivo vazio")
    if len(data) > MAX_CAPA_BYTES:
        raise AppError("Arquivo excede o limite de 5 MB")

    declared = _formato_declarado(content_type)
    extension_format = _formato_da_extensao(filename)
    foco_x = _foco(foco_x)
    foco_y = _foco(foco_y)

    source = _abrir_imagem(data)
    oriented: Image.Image | None = None
    rgb: Image.Image | None = None
    cropped: Image.Image | None = None
    detail: Image.Image | None = None
    card: Image.Image | None = None
    try:
        actual = (source.format or "").upper()
        if actual not in _ALLOWED_FORMATS:
            raise AppError("Formato não permitido. Use JPEG, PNG ou WebP")
        if declared is not None and declared != actual:
            raise AppError("O tipo informado não corresponde à imagem")
        if extension_format is not None and extension_format != actual:
            raise AppError("A extensão não corresponde à imagem")
        if getattr(source, "is_animated", False):
            raise AppError("Use uma imagem estática em JPEG, PNG ou WebP")

        oriented = ImageOps.exif_transpose(source) or source
        rgb = _para_rgb(oriented)
        width, height = rgb.size
        if width < MIN_CAPA_WIDTH or height < MIN_CAPA_HEIGHT:
            raise AppError("A imagem deve ter pelo menos 800 × 450 pixels")

        cropped = _recortar_16_9(rgb, foco_x, foco_y)
        detail = cropped.resize(DETAIL_SIZE, Image.Resampling.LANCZOS)
        card = detail.resize(CARD_SIZE, Image.Resampling.LANCZOS)
        return CapaProcessada(
            card=_para_webp(card, CARD_QUALITY),
            detail=_para_webp(detail, DETAIL_QUALITY),
            foco_x=foco_x,
            foco_y=foco_y,
        )
    finally:
        for item in (card, detail, cropped, rgb):
            if item is not None:
                item.close()
        if oriented is not None and oriented is not source:
            oriented.close()
        source.close()


def _foco(value: float | None) -> float:
    if value is None:
        return 0.5
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise AppError("O foco da capa deve estar entre 0 e 1") from exc
    if number < 0 or number > 1:
        raise AppError("O foco da capa deve estar entre 0 e 1")
    return number


def _formato_declarado(content_type: str | None) -> str | None:
    if content_type is None:
        return None
    mime = content_type.split(";", 1)[0].strip().lower()
    if not mime:
        return None
    declared = _MIME_FORMAT.get(mime)
    if declared is None:
        raise AppError("Formato não permitido. Use JPEG, PNG ou WebP")
    return declared


def _formato_da_extensao(filename: str | None) -> str | None:
    if not filename or "." not in filename:
        return None
    extension = filename.rsplit(".", 1)[-1].strip().lower()
    if not extension:
        return None
    declared = _EXTENSION_FORMAT.get(extension)
    if declared is None:
        raise AppError("Formato não permitido. Use JPEG, PNG ou WebP")
    return declared


def _abrir_imagem(data: bytes) -> Image.Image:
    """Abre e decodifica de fato. O limite de pixels vale antes do load."""
    with _image_lock:
        previous_limit = Image.MAX_IMAGE_PIXELS
        Image.MAX_IMAGE_PIXELS = MAX_CAPA_PIXELS
        try:
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore", DecompressionBombWarning)
                    image = Image.open(BytesIO(data))
            except DecompressionBombError as exc:
                raise AppError("A imagem excede o limite de 20 megapixels") from exc
            except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as exc:
                raise AppError("Arquivo de imagem inválido ou corrompido") from exc

            pixels = image.width * image.height
            if pixels > MAX_CAPA_PIXELS or image.width > MAX_CAPA_PIXELS or image.height > MAX_CAPA_PIXELS:
                image.close()
                raise AppError("A imagem excede o limite de 20 megapixels")
            try:
                image.load()
            except DecompressionBombError as exc:
                image.close()
                raise AppError("A imagem excede o limite de 20 megapixels") from exc
            except (OSError, SyntaxError, ValueError) as exc:
                image.close()
                raise AppError("Arquivo de imagem inválido ou corrompido") from exc
            return image
        finally:
            Image.MAX_IMAGE_PIXELS = previous_limit


def _para_rgb(image: Image.Image) -> Image.Image:
    if image.mode == "RGB":
        cleaned = image.copy()
        cleaned.info.clear()
        return cleaned
    if image.mode in {"RGBA", "LA"} or (image.mode == "P" and "transparency" in image.info):
        rgba = image.convert("RGBA")
        background = Image.new("RGB", rgba.size, (255, 255, 255))
        background.paste(rgba, mask=rgba.getchannel("A"))
        rgba.close()
        return background
    converted = image.convert("RGB")
    converted.info.clear()
    return converted


def _recortar_16_9(image: Image.Image, foco_x: float, foco_y: float) -> Image.Image:
    width, height = image.size
    target = 16 / 9
    if width / height > target:
        crop_h = height
        crop_w = min(width, max(1, round(height * target)))
    else:
        crop_w = width
        crop_h = min(height, max(1, round(width / target)))
    left = round(foco_x * width - crop_w / 2)
    top = round(foco_y * height - crop_h / 2)
    left = max(0, min(left, width - crop_w))
    top = max(0, min(top, height - crop_h))
    cropped = image.crop((left, top, left + crop_w, top + crop_h))
    cropped.info.clear()
    return cropped


def _para_webp(image: Image.Image, quality: int) -> bytes:
    buffer = BytesIO()
    image.save(buffer, format="WEBP", quality=quality, method=6)
    return buffer.getvalue()
