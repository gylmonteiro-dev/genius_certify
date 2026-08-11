from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = (
        "postgresql+asyncpg://nexus:changeme_postgres@localhost:5432/nexus_certify"
    )
    jwt_secret: str = "changeme_jwt_secret_use_a_long_random_string"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24  # 24h

    superadmin_email: str = "admin@nexusgenius.com.br"
    superadmin_password: str = "changeme_superadmin"
    superadmin_nome: str = "Super Admin"

    s3_endpoint_url: str | None = None
    s3_access_key: str | None = None
    s3_secret_key: str | None = None
    s3_bucket: str = "nexus-certify"
    s3_region: str = "us-east-1"

    @property
    def database_url_sync(self) -> str:
        """URL síncrona para o Alembic (psycopg)."""
        return self.database_url.replace(
            "postgresql+asyncpg://",
            "postgresql+psycopg://",
            1,
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
