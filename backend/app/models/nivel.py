from typing import TYPE_CHECKING

from sqlalchemy import String, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.turma import Turma
    from app.models.aluno import Aluno


class Nivel(Base):
    __tablename__ = "niveis"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    ordem: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    turmas: Mapped[list["Turma"]] = relationship("Turma", back_populates="nivel")
    alunos: Mapped[list["Aluno"]] = relationship("Aluno", back_populates="nivel")
