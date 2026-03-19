from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.pessoa import Pessoa
    from app.models.nivel import Nivel
    from app.models.matricula import Matricula
    from app.models.presenca import Presenca
    from app.models.pagamento import PagamentoAluno


class Aluno(Base):
    __tablename__ = "alunos"

    pessoa_id: Mapped[int] = mapped_column(ForeignKey("pessoas.id"), primary_key=True)
    nivel_id: Mapped[Optional[int]] = mapped_column(ForeignKey("niveis.id"), nullable=True)
    responsavel_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoas.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(10), nullable=False, default="ativo")  # ativo|inativo

    pessoa: Mapped["Pessoa"] = relationship(
        "Pessoa", back_populates="aluno", foreign_keys=[pessoa_id]
    )
    nivel: Mapped[Optional["Nivel"]] = relationship("Nivel", back_populates="alunos")
    responsavel: Mapped[Optional["Pessoa"]] = relationship(
        "Pessoa", back_populates="dependentes", foreign_keys=[responsavel_id]
    )
    matriculas: Mapped[list["Matricula"]] = relationship("Matricula", back_populates="aluno")
    presencas: Mapped[list["Presenca"]] = relationship(
        "Presenca",
        primaryjoin="foreign(Presenca.aluno_id) == Aluno.pessoa_id",
        viewonly=True,
    )
    pagamentos: Mapped[list["PagamentoAluno"]] = relationship("PagamentoAluno", back_populates="aluno")
