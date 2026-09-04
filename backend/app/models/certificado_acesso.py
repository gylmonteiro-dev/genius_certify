import enum
import uuid

from sqlalchemy import Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class CertificadoAcessoTipo(str, enum.Enum):
    VISUALIZACAO = "visualizacao"
    DOWNLOAD = "download"


class CertificadoAcesso(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Evento de acesso a um certificado, sempre vinculado ao tenant."""

    __tablename__ = "certificado_acessos"

    certificado_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("certificados.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    instituicao_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("instituicoes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tipo: Mapped[CertificadoAcessoTipo] = mapped_column(
        Enum(
            CertificadoAcessoTipo,
            name="certificado_acesso_tipo",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        nullable=False,
    )
