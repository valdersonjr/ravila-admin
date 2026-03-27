from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, Boolean, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.pessoa import Pessoa


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    pessoa_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoas.id"), nullable=True, unique=True)
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="secretario")
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    foto_key: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    pessoa: Mapped[Optional["Pessoa"]] = relationship("Pessoa", back_populates="user")
