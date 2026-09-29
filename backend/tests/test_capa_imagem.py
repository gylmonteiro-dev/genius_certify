import struct
import zlib
from io import BytesIO

import pytest
from PIL import Image, ImageDraw

from app.core.exceptions import AppError
from app.services.capa_imagem import (
    CARD_SIZE,
    DETAIL_SIZE,
    MAX_CAPA_BYTES,
    processar_capa,
)
from pathlib import Path


def _imagem(fmt: str, size: tuple[int, int] = (1600, 900), color: tuple[int, int, int] = (20, 80, 160)) -> bytes:
    image = Image.new("RGB", size, color)
    buffer = BytesIO()
    image.save(buffer, format=fmt)
    image.close()
    return buffer.getvalue()


def _png_grande(width: int, height: int) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    idat = zlib.compress(b"\x00")
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", idat)
        + chunk(b"IEND", b"")
    )


def _saida(data: bytes, **kwargs: object):
    return processar_capa(
        data,
        filename=kwargs.get("filename", "capa.jpg"),  # type: ignore[arg-type]
        content_type=kwargs.get("content_type", "image/jpeg"),  # type: ignore[arg-type]
        foco_x=kwargs.get("foco_x"),  # type: ignore[arg-type]
        foco_y=kwargs.get("foco_y"),  # type: ignore[arg-type]
    )


def test_jpeg_png_e_webp_validos_geram_duas_versoes() -> None:
    tamanhos: dict[str, tuple[int, int]] = {}
    for fmt, filename, mime in (
        ("JPEG", "foto.jpg", "image/jpeg"),
        ("PNG", "foto.png", "image/png"),
        ("WEBP", "foto.webp", "image/webp"),
    ):
        result = _saida(_imagem(fmt), filename=filename, content_type=mime)
        card = Image.open(BytesIO(result.card))
        detail = Image.open(BytesIO(result.detail))
        assert card.format == "WEBP"
        assert detail.format == "WEBP"
        assert card.size == CARD_SIZE
        assert detail.size == DETAIL_SIZE
        assert result.foco_x == 0.5
        assert result.foco_y == 0.5
        tamanhos[fmt] = (len(result.card), len(result.detail))
        card.close()
        detail.close()
    assert tamanhos["JPEG"][1] > tamanhos["JPEG"][0]


def test_formatos_proibidos() -> None:
    samples = {
        "gif": _imagem("GIF", (800, 450)),
        "bmp": _imagem("BMP", (800, 450)),
        "tiff": _imagem("TIFF", (800, 450)),
        "svg": b'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"></svg>',
        "heic": b"\x00\x00\x00\x18ftypheic",
    }
    names = {
        "gif": ("anim.gif", "image/gif"),
        "bmp": ("scan.bmp", "image/bmp"),
        "tiff": ("scan.tiff", "image/tiff"),
        "svg": ("logo.svg", "image/svg+xml"),
        "heic": ("foto.heic", "image/heic"),
    }
    for kind, data in samples.items():
        filename, mime = names[kind]
        with pytest.raises(AppError):
            _saida(data, filename=filename, content_type=mime)


def test_arquivo_vazio() -> None:
    with pytest.raises(AppError, match="vazio"):
        _saida(b"", filename="foto.jpg", content_type="image/jpeg")


def test_extensao_falsa() -> None:
    png = _imagem("PNG")
    with pytest.raises(AppError, match="extensão"):
        _saida(png, filename="foto.jpg", content_type="image/png")


def test_mime_falso() -> None:
    png = _imagem("PNG")
    with pytest.raises(AppError, match="tipo informado"):
        _saida(png, filename="foto.png", content_type="image/jpeg")


def test_imagem_corrompida() -> None:
    with pytest.raises(AppError, match="corrompido"):
        _saida(b"\xff\xd8\xff\x00nao-e-jpeg", filename="foto.jpg", content_type="image/jpeg")


def test_arquivo_acima_de_5_mb() -> None:
    data = b"\xff\xd8\xff" + b"0" * (MAX_CAPA_BYTES + 10)
    with pytest.raises(AppError, match="5 MB"):
        _saida(data, filename="grande.jpg", content_type="image/jpeg")


def test_imagem_acima_do_limite_de_pixels() -> None:
    data = _png_grande(5000, 5000)
    with pytest.raises(AppError, match="megapixels"):
        _saida(data, filename="grande.png", content_type="image/png")


def test_imagem_abaixo_da_dimensao_minima() -> None:
    with pytest.raises(AppError, match="800"):
        _saida(
            _imagem("JPEG", (600, 400)),
            filename="pequena.jpg",
            content_type="image/jpeg",
        )


def test_orientacao_exif_e_remocao_de_metadados() -> None:
    image = Image.new("RGB", (900, 1600), (10, 40, 180))
    exif = image.getexif()
    exif[274] = 6
    buffer = BytesIO()
    image.save(
        buffer,
        format="JPEG",
        exif=exif.tobytes(),
        quality=90,
        comment=b"SECRET-META-MARKER",
    )
    image.close()
    result = _saida(buffer.getvalue(), filename="virada.jpg", content_type="image/jpeg")
    detail = Image.open(BytesIO(result.detail))
    assert detail.size == DETAIL_SIZE
    assert 274 not in detail.getexif()
    assert b"SECRET-META-MARKER" not in result.detail
    assert b"SECRET-META-MARKER" not in result.card
    detail.close()


def test_foco_desloca_o_recorte() -> None:
    image = Image.new("RGB", (2000, 900), (0, 0, 0))
    ImageDraw.Draw(image).rectangle((0, 0, 399, 899), fill=(255, 0, 0))
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    image.close()
    esquerda = _saida(buffer.getvalue(), filename="larga.png", content_type="image/png", foco_x=0, foco_y=0.5)
    direita = _saida(buffer.getvalue(), filename="larga.png", content_type="image/png", foco_x=1, foco_y=0.5)
    pixel_esq = Image.open(BytesIO(esquerda.detail)).getpixel((10, 400))
    pixel_dir = Image.open(BytesIO(direita.detail)).getpixel((10, 400))
    assert pixel_esq[0] > 200
    assert pixel_dir[0] < 40
    assert esquerda.foco_x == 0
    assert direita.foco_x == 1


def test_certificado_nao_recebe_capa() -> None:
    source = Path(__file__).resolve().parents[1].joinpath("app/services/pdf_service.py").read_text()
    assert "capa_card_url" not in source
    assert "capa_detail_url" not in source
