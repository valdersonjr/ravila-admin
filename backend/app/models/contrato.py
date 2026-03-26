from datetime import date, datetime
from decimal import Decimal
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, Date, DateTime, Numeric, Integer, ForeignKey, Table, Column, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.aluno import Aluno
    from app.models.pessoa import Pessoa


# Tabela associativa contrato ↔ aluno (N:M)
contrato_alunos = Table(
    "contrato_alunos",
    Base.metadata,
    Column("contrato_id", Integer, ForeignKey("contratos.id"), primary_key=True),
    Column("aluno_id", Integer, ForeignKey("alunos.pessoa_id"), primary_key=True),
)


class Contrato(Base):
    __tablename__ = "contratos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    contratante_id: Mapped[int] = mapped_column(ForeignKey("pessoas.id"), nullable=False)
    curso: Mapped[str] = mapped_column(String(100), nullable=False)
    valor_mensalidade: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    desconto_percentual: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    desconto_valor: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    dia_vencimento: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    valor_reposicao_hora: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=35)
    data_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    data_fim: Mapped[date] = mapped_column(Date, nullable=False)
    data_assinatura: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    local_assinatura: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, default="Goianésia GO")
    observacoes: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    status: Mapped[str] = mapped_column(String(15), nullable=False, default="rascunho")
    contrato_assinado_key: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    alunos: Mapped[list["Aluno"]] = relationship("Aluno", secondary=contrato_alunos, lazy="selectin")
    contratante: Mapped["Pessoa"] = relationship("Pessoa", foreign_keys=[contratante_id])
