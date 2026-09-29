from __future__ import annotations

import json
import logging
import re
from functools import lru_cache
from uuid import UUID

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.core.config import Settings, get_settings
from app.core.exceptions import AppError

logger = logging.getLogger(__name__)

CAPA_CACHE_CONTROL = "public, max-age=31536000, immutable"
_CAPA_VERSION = re.compile(r"^[0-9a-f]{12}$")
_CAPA_KEY = re.compile(
    r"^instituicoes/(?P<inst>[0-9a-fA-F-]{36})/eventos/"
    r"(?P<evento>[0-9a-fA-F-]{36})/capa-(?:card|detail)-[0-9a-f]{12}\.webp$"
)


class StorageService:
    """Upload/download de assets no S3/MinIO. Banco guarda apenas a URL pública."""

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        if not self._settings.s3_endpoint_url:
            raise AppError("S3_ENDPOINT_URL não configurado")
        if not self._settings.s3_access_key or not self._settings.s3_secret_key:
            raise AppError("Credenciais S3 não configuradas")

        self._client = boto3.client(
            "s3",
            endpoint_url=self._settings.s3_endpoint_url,
            aws_access_key_id=self._settings.s3_access_key,
            aws_secret_access_key=self._settings.s3_secret_key,
            region_name=self._settings.s3_region,
            config=Config(signature_version="s3v4"),
        )
        self._bucket = self._settings.s3_bucket

    @property
    def public_base_url(self) -> str:
        base = (
            self._settings.s3_public_endpoint_url
            or self._settings.s3_endpoint_url
            or ""
        ).rstrip("/")
        return f"{base}/{self._bucket}"

    def ensure_bucket(self) -> None:
        try:
            self._client.head_bucket(Bucket=self._bucket)
        except ClientError:
            self._client.create_bucket(Bucket=self._bucket)
            logger.info("Bucket criado: %s", self._bucket)

        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": ["*"]},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{self._bucket}/*"],
                }
            ],
        }
        try:
            self._client.put_bucket_policy(
                Bucket=self._bucket,
                Policy=json.dumps(policy),
            )
        except ClientError as exc:
            logger.warning("Não foi possível aplicar policy pública no bucket: %s", exc)

    def upload_bytes(
        self,
        *,
        data: bytes,
        key: str,
        content_type: str,
        cache_control: str | None = None,
    ) -> str:
        params: dict[str, object] = {
            "Bucket": self._bucket,
            "Key": key,
            "Body": data,
            "ContentType": content_type,
        }
        if cache_control:
            params["CacheControl"] = cache_control
        self._client.put_object(**params)
        return f"{self.public_base_url}/{key}"

    def delete_keys(self, keys: list[str]) -> None:
        """Remove objetos já substituídos. Chave insegura é ignorada."""
        for key in keys:
            if not self.is_safe_object_key(key):
                logger.warning("Recusa de exclusão de chave insegura: %s", key)
                continue
            try:
                self._client.delete_object(Bucket=self._bucket, Key=key)
            except ClientError as exc:
                logger.warning("Falha ao excluir objeto %s: %s", key, exc)

    def key_from_url(self, url: str | None) -> str | None:
        if not url:
            return None
        return self.key_from_public_url(
            url,
            bucket=self._bucket,
            public_base=self.public_base_url,
        )

    @staticmethod
    def build_evento_capa_key(
        instituicao_id: UUID,
        evento_id: UUID,
        kind: str,
        version: str,
    ) -> str:
        if kind not in {"card", "detail"}:
            raise AppError("Tipo de capa inválido")
        if _CAPA_VERSION.fullmatch(version) is None:
            raise AppError("Versão de capa inválida")
        return (
            f"instituicoes/{instituicao_id}/eventos/{evento_id}/"
            f"capa-{kind}-{version}.webp"
        )

    @staticmethod
    def is_safe_object_key(key: str) -> bool:
        if not key or key.startswith("/") or "\\" in key:
            return False
        parts = key.split("/")
        if any(part in {"", ".", ".."} for part in parts):
            return False
        return key.startswith("instituicoes/")

    @staticmethod
    def is_evento_capa_key(key: str, instituicao_id: UUID, evento_id: UUID) -> bool:
        match = _CAPA_KEY.fullmatch(key)
        if match is None:
            return False
        return (
            match.group("inst").lower() == str(instituicao_id).lower()
            and match.group("evento").lower() == str(evento_id).lower()
        )

    def download_bytes(self, key: str) -> tuple[bytes, str]:
        response = self._client.get_object(Bucket=self._bucket, Key=key)
        body = response["Body"].read()
        content_type = response.get("ContentType") or "application/octet-stream"
        return body, content_type

    @staticmethod
    def key_from_public_url(url: str, *, bucket: str, public_base: str) -> str | None:
        prefix = f"{public_base.rstrip('/')}/"
        if url.startswith(prefix):
            return url[len(prefix) :]
        # fallback: .../bucket/key
        marker = f"/{bucket}/"
        if marker in url:
            return url.split(marker, 1)[1]
        return None

    def build_instituicao_asset_key(
        self,
        instituicao_id: UUID,
        asset_type: str,
        extension: str,
    ) -> str:
        return f"instituicoes/{instituicao_id}/{asset_type}.{extension}"


@lru_cache
def get_storage_service() -> StorageService:
    return StorageService()
