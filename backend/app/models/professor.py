from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.pessoa import Pessoa
    from app.models.turma import Turma
    from app.models.aula import Aula


class Professor(Base):
    __tablename__ = "professores"

    pessoa_id: Mapped[int] = mapped_column(ForeignKey("pessoas.id"), primary_key=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    pessoa: Mapped["Pessoa"] = relationship("Pessoa", back_populates="professor")
    turmas: Mapped[list["Turma"]] = relationship("Turma", back_populates="professor")
    aulas: Mapped[list["Aula"]] = relationship("Aula", back_populates="professor")
