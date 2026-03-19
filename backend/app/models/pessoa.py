from datetime import datetime, date
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, Date, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.professor import Professor
    from app.models.aluno import Aluno


class Pessoa(Base):
    __tablename__ = "pessoas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    cpf: Mapped[str] = mapped_column(String(11), unique=True, nullable=False, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    telefone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    data_nascimento: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", back_populates="pessoa", uselist=False)
    professor: Mapped[Optional["Professor"]] = relationship("Professor", back_populates="pessoa", uselist=False)
    aluno: Mapped[Optional["Aluno"]] = relationship(
        "Aluno", back_populates="pessoa", foreign_keys="Aluno.pessoa_id", uselist=False
    )
    dependentes: Mapped[list["Aluno"]] = relationship(
        "Aluno", back_populates="responsavel", foreign_keys="Aluno.responsavel_id"
    )
