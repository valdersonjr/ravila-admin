from datetime import date, datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, Date, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.pessoa import Pessoa
    from app.models.nivel import Nivel
    from app.models.matricula import Matricula
    from app.models.presenca import Presenca
    from app.models.contrato import Contrato


class Aluno(Base):
    __tablename__ = "alunos"

    pessoa_id: Mapped[int] = mapped_column(ForeignKey("pessoas.id"), primary_key=True)
    nivel_id: Mapped[Optional[int]] = mapped_column(ForeignKey("niveis.id"), nullable=True)
    responsavel_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoas.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(10), nullable=False, default="ativo")  # ativo|inativo
    nivel_questao: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)  # A1..C2
    nivel_questao_avaliado_em: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    aniversario: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    data_nascimento: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    pessoa: Mapped["Pessoa"] = relationship(
        "Pessoa", back_populates="aluno", foreign_keys=[pessoa_id]
    )
    nivel: Mapped[Optional["Nivel"]] = relationship("Nivel", back_populates="alunos")
    responsavel: Mapped[Optional["Pessoa"]] = relationship(
        "Pessoa", back_populates="dependentes", foreign_keys=[responsavel_id]
    )
    matriculas: Mapped[list["Matricula"]] = relationship("Matricula", back_populates="aluno")
    contratos: Mapped[list["Contrato"]] = relationship(
        "Contrato",
        secondary="contrato_alunos",
        lazy="noload",
        viewonly=True,
        overlaps="alunos",
    )
    presencas: Mapped[list["Presenca"]] = relationship(
        "Presenca",
        primaryjoin="foreign(Presenca.aluno_id) == Aluno.pessoa_id",
        viewonly=True,
    )

    @property
    def tem_contrato_ativo(self) -> bool:
        return any(c.status == "ativo" for c in self.contratos)

    @property
    def status_calculado(self) -> str:
        for m in self.matriculas:
            if m.status == "ativa" and m.turma and m.turma.status == "ativa":
                return "ativo"
        return "inativo"
