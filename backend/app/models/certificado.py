import enum
import uuid

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.aluno import Aluno
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.curso import Curso
from app.models.instituicao import Instituicao


class CertificadoStatus(str, enum.Enum):
    ACTIVE = "active"
    REVOKED = "revoked"
    EXPIRED = "expired"


class Certificado(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Certificado emitido; validação pública via codigo_validacao (UUID)."""

    __tablename__ = "certificados"

    codigo_validacao: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        unique=True,
        nullable=False,
        default=uuid.uuid4,
        index=True,
    )
    instituicao_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("instituicoes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    curso_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cursos.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    aluno_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("alunos.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    numero_certificado: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    # Snapshots no momento da emissão (PDF on-the-fly / auditoria)
    aluno_nome: Mapped[str] = mapped_column(String(255), nullable=False)
    curso_titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    instituicao_nome: Mapped[str] = mapped_column(String(255), nullable=False)
    carga_horaria: Mapped[int] = mapped_column(nullable=False)
    instrutor: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[CertificadoStatus] = mapped_column(
        Enum(
            CertificadoStatus,
            name="certificado_status",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        nullable=False,
        default=CertificadoStatus.ACTIVE,
    )

    instituicao: Mapped[Instituicao] = relationship(back_populates="certificados")
    curso: Mapped[Curso] = relationship(back_populates="certificados")
    aluno: Mapped[Aluno] = relationship(back_populates="certificados")
