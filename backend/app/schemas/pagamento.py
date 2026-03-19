from datetime import datetime, date
from decimal import Decimal
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict


class PagamentoAlunoCreate(BaseModel):
    aluno_id: int
    referencia: str  # MM/YYYY
    valor: Decimal
    status: Literal["pendente", "pago", "atrasado"] = "pendente"
    forma: Optional[Literal["boleto", "pix"]] = None
    data_pagamento: Optional[date] = None


class PagamentoAlunoUpdate(BaseModel):
    status: Optional[Literal["pendente", "pago", "atrasado"]] = None
    forma: Optional[Literal["boleto", "pix"]] = None
    data_pagamento: Optional[date] = None


class PagamentoAlunoOut(BaseModel):
    id: int
    aluno_id: int
    aluno_nome_snapshot: str
    referencia: str
    valor: Decimal
    status: str
    forma: Optional[str] = None
    data_pagamento: Optional[date] = None
    comprovante_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PagamentoProfessorCreate(BaseModel):
    professor_id: int
    referencia: str  # MM/YYYY
    valor_total: Decimal
    aulas_realizadas_snapshot: Optional[int] = None
    forma: Optional[Literal["pix", "transferencia", "boleto"]] = None
    data_pagamento: Optional[date] = None


class PagamentoProfessorUpdate(BaseModel):
    forma: Optional[Literal["pix", "transferencia", "boleto"]] = None
    data_pagamento: Optional[date] = None
    valor_total: Optional[Decimal] = None


class PagamentoProfessorOut(BaseModel):
    id: int
    professor_id: int
    professor_nome_snapshot: str
    tipo_contrato_snapshot: str
    referencia: str
    valor_total: Decimal
    aulas_realizadas_snapshot: Optional[int] = None
    forma: Optional[str] = None
    data_pagamento: Optional[date] = None
    comprovante_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CalculoProfessorOut(BaseModel):
    professor_id: int
    referencia: str
    aulas_realizadas: int
    valor_por_aula: Optional[Decimal] = None
    valor_calculado: Optional[Decimal] = None
