from datetime import datetime, date
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, Integer, ForeignKey, DateTime, Date, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.turma import Turma
    from app.models.professor import Professor
    from app.models.presenca import Presenca


class Aula(Base):
    __tablename__ = "aulas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    turma_id: Mapped[int] = mapped_column(ForeignKey("turmas.id"), nullable=False)
    data: Mapped[date] = mapped_column(Date, nullable=False)
    hora_inicio: Mapped[str] = mapped_column(String(5), nullable=False)  # HH:MM
    hora_fim: Mapped[str] = mapped_column(String(5), nullable=False)     # HH:MM
    professor_id: Mapped[int] = mapped_column(ForeignKey("professores.pessoa_id"), nullable=False)
    professor_nome_snapshot: Mapped[str] = mapped_column(String(200), nullable=False)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False, default="regular")  # regular|substitutiva
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="agendada")  # agendada|realizada|cancelada
    aula_origem_id: Mapped[Optional[int]] = mapped_column(ForeignKey("aulas.id"), nullable=True)
    descricao: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    turma: Mapped["Turma"] = relationship("Turma", back_populates="aulas")
    professor: Mapped["Professor"] = relationship("Professor", back_populates="aulas")
    presencas: Mapped[list["Presenca"]] = relationship("Presenca", back_populates="aula")
    aula_origem: Mapped[Optional["Aula"]] = relationship("Aula", remote_side="Aula.id", foreign_keys=[aula_origem_id])
