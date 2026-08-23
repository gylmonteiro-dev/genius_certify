from __future__ import annotations

import enum

from sqlalchemy import Boolean, Enum, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class CatalogoEventoKind(str, enum.Enum):
    CATEGORIA = "categoria"
    MODALIDADE = "modalidade"
    TIPO = "tipo"


class CatalogoEventoItem(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "catalogo_evento_itens"
    __table_args__ = (
        UniqueConstraint("kind", "slug", name="uq_catalogo_evento_itens_kind_slug"),
    )

    kind: Mapped[CatalogoEventoKind] = mapped_column(
        Enum(
            CatalogoEventoKind,
            name="catalogo_evento_kind",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        nullable=False,
        index=True,
    )
    slug: Mapped[str] = mapped_column(String(64), nullable=False)
    nome: Mapped[str] = mapped_column(String(128), nullable=False)
    nome_en: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    ordem: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
