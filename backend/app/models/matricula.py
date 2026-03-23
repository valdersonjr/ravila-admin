from datetime import date
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, ForeignKey, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.aluno import Aluno
    from app.models.turma import Turma


class Matricula(Base):
    __tablename__ = "matriculas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    aluno_id: Mapped[int] = mapped_column(ForeignKey("alunos.pessoa_id"), nullable=False)
    turma_id: Mapped[int] = mapped_column(ForeignKey("turmas.id"), nullable=False)
    data_inicio: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    data_fim: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ativa")  # ativa|cancelada|concluida

    aluno: Mapped["Aluno"] = relationship("Aluno", back_populates="matriculas")
    turma: Mapped["Turma"] = relationship("Turma", back_populates="matriculas")
