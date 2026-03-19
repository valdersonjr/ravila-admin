from decimal import Decimal
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, Boolean, Numeric, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.pessoa import Pessoa
    from app.models.turma import Turma
    from app.models.aula import Aula
    from app.models.pagamento import PagamentoProfessor


class Professor(Base):
    __tablename__ = "professores"

    pessoa_id: Mapped[int] = mapped_column(ForeignKey("pessoas.id"), primary_key=True)
    tipo_contrato: Mapped[str] = mapped_column(String(10), nullable=False)  # clt|pj
    salario: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    valor_por_aula: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    pessoa: Mapped["Pessoa"] = relationship("Pessoa", back_populates="professor")
    turmas: Mapped[list["Turma"]] = relationship("Turma", back_populates="professor")
    aulas: Mapped[list["Aula"]] = relationship("Aula", back_populates="professor")
    pagamentos: Mapped[list["PagamentoProfessor"]] = relationship(
        "PagamentoProfessor", back_populates="professor"
    )
