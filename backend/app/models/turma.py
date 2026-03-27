from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, Integer, ForeignKey, DateTime, func, Time
from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.professor import Professor
    from app.models.aula import Aula
    from app.models.matricula import Matricula


class HorarioTurma(Base):
    __tablename__ = "horarios_turma"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    turma_id: Mapped[int] = mapped_column(ForeignKey("turmas.id"), nullable=False)
    dia_semana: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Mon, 6=Sun
    hora_inicio: Mapped[str] = mapped_column(String(5), nullable=False)
    hora_fim: Mapped[str] = mapped_column(String(5), nullable=False)

    turma: Mapped["Turma"] = relationship("Turma", back_populates="horarios")


class Turma(Base):
    __tablename__ = "turmas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    livro: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    professor_id: Mapped[int] = mapped_column(ForeignKey("professores.pessoa_id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ativa")  # ativa|encerrada
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    professor: Mapped["Professor"] = relationship("Professor", back_populates="turmas")
    horarios: Mapped[list["HorarioTurma"]] = relationship(
        "HorarioTurma", back_populates="turma", cascade="all, delete-orphan"
    )
    aulas: Mapped[list["Aula"]] = relationship("Aula", back_populates="turma")
    matriculas: Mapped[list["Matricula"]] = relationship("Matricula", back_populates="turma")
