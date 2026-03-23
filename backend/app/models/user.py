from typing import TYPE_CHECKING

from sqlalchemy import String, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.pessoa import Pessoa


class User(Base):
    __tablename__ = "users"

    pessoa_id: Mapped[int] = mapped_column(ForeignKey("pessoas.id"), primary_key=True)
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_secretario: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    pessoa: Mapped["Pessoa"] = relationship("Pessoa", back_populates="user")
