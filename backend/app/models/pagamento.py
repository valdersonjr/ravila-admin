from datetime import datetime, date
from decimal import Decimal
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, ForeignKey, DateTime, Date, Numeric, Boolean, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.aluno import Aluno
    from app.models.professor import Professor


class PagamentoAluno(Base):
    __tablename__ = "pagamentos_aluno"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    aluno_id: Mapped[int] = mapped_column(ForeignKey("alunos.pessoa_id"), nullable=False)
    aluno_nome_snapshot: Mapped[str] = mapped_column(String(200), nullable=False)
    referencia: Mapped[str] = mapped_column(String(7), nullable=False)  # MM/YYYY
    valor: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pendente")  # pendente|pago|atrasado
    forma: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # boleto|pix
    data_pagamento: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    comprovante_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    aluno: Mapped["Aluno"] = relationship("Aluno", back_populates="pagamentos")


class PagamentoProfessor(Base):
    __tablename__ = "pagamentos_professor"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    professor_id: Mapped[int] = mapped_column(ForeignKey("professores.pessoa_id"), nullable=False)
    professor_nome_snapshot: Mapped[str] = mapped_column(String(200), nullable=False)
    tipo_contrato_snapshot: Mapped[str] = mapped_column(String(10), nullable=False)
    referencia: Mapped[str] = mapped_column(String(7), nullable=False)  # MM/YYYY
    valor_total: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    aulas_realizadas_snapshot: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    forma: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # pix|transferencia|boleto
    data_pagamento: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    comprovante_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    professor: Mapped["Professor"] = relationship("Professor", back_populates="pagamentos")
