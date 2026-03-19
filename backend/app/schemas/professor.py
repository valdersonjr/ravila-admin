from datetime import date
from decimal import Decimal
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict

from app.schemas.pessoa import PessoaOut


class ProfessorCreate(BaseModel):
    pessoa_id: int
    tipo_contrato: Literal["clt", "pj"]
    salario: Optional[Decimal] = None
    valor_por_aula: Optional[Decimal] = None


class ProfessorUpdate(BaseModel):
    tipo_contrato: Optional[Literal["clt", "pj"]] = None
    salario: Optional[Decimal] = None
    valor_por_aula: Optional[Decimal] = None
    ativo: Optional[bool] = None


class ProfessorOut(BaseModel):
    pessoa_id: int
    tipo_contrato: str
    salario: Optional[Decimal] = None
    valor_por_aula: Optional[Decimal] = None
    ativo: bool
    pessoa: PessoaOut

    model_config = ConfigDict(from_attributes=True)


# ── Dashboard ─────────────────────────────────────────────────────────────────

class TurmaDashboard(BaseModel):
    id: int
    nome: str
    status: str
    num_alunos: int


class AulasMes(BaseModel):
    realizadas: int
    agendadas: int
    canceladas: int
    presenca_media: Optional[float] = None


class AulasStats(BaseModel):
    total: int
    realizadas: int
    canceladas: int
    agendadas: int
    mes_atual: AulasMes


class HistoricoPagamento(BaseModel):
    id: int
    referencia: str
    valor_total: Decimal
    aulas_realizadas_snapshot: Optional[int] = None
    forma: Optional[str] = None
    data_pagamento: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)


class MesHistorico(BaseModel):
    mes: str          # MM/YYYY
    realizadas: int
    canceladas: int
    presenca_media: Optional[float] = None


class ProfessorDashboardOut(BaseModel):
    professor_id: int
    nome: str
    cpf: str
    tipo_contrato: str
    salario: Optional[Decimal] = None
    valor_por_aula: Optional[Decimal] = None
    ativo: bool
    turmas: list[TurmaDashboard]
    aulas: AulasStats
    presenca_media: Optional[float] = None
    custo_total_pago: Decimal
    custo_mes_atual: Optional[Decimal] = None
    historico_pagamentos: list[HistoricoPagamento]
    historico_mensal: list[MesHistorico]
