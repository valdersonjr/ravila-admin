from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Literal

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.schemas.aluno import AlunoOut
from app.schemas.pessoa import PessoaOut


class ContratoCreate(BaseModel):
    aluno_ids: list[int]
    contratante_id: int
    tipo: Literal["formal", "informal"] = "formal"
    curso: str
    valor_mensalidade: Decimal
    desconto_percentual: Optional[Decimal] = None
    desconto_valor: Optional[Decimal] = None
    dia_vencimento: int = 10
    valor_reposicao_hora: Decimal = Decimal("35.00")
    data_inicio: date
    data_fim: date
    data_assinatura: Optional[date] = None
    local_assinatura: Optional[str] = "Goianésia GO"
    observacoes: Optional[str] = None

    @field_validator("aluno_ids")
    @classmethod
    def valida_alunos(cls, v: list[int]) -> list[int]:
        if not v:
            raise ValueError("Informe ao menos um aluno")
        return v

    @field_validator("dia_vencimento")
    @classmethod
    def valida_dia(cls, v: int) -> int:
        if not (1 <= v <= 28):
            raise ValueError("Dia de vencimento deve ser entre 1 e 28")
        return v

    @model_validator(mode="after")
    def valida_desconto(self) -> "ContratoCreate":
        if self.desconto_percentual and self.desconto_valor:
            raise ValueError("Informe apenas um tipo de desconto: percentual ou valor fixo")
        return self


class ContratoUpdate(BaseModel):
    aluno_ids: Optional[list[int]] = None
    tipo: Optional[Literal["formal", "informal"]] = None
    curso: Optional[str] = None
    valor_mensalidade: Optional[Decimal] = None
    desconto_percentual: Optional[Decimal] = None
    desconto_valor: Optional[Decimal] = None
    dia_vencimento: Optional[int] = None
    valor_reposicao_hora: Optional[Decimal] = None
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    data_assinatura: Optional[date] = None
    local_assinatura: Optional[str] = None
    observacoes: Optional[str] = None

    @field_validator("aluno_ids")
    @classmethod
    def valida_alunos(cls, v: Optional[list[int]]) -> Optional[list[int]]:
        if v is not None and len(v) == 0:
            raise ValueError("Informe ao menos um aluno")
        return v

    @field_validator("dia_vencimento")
    @classmethod
    def valida_dia(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (1 <= v <= 28):
            raise ValueError("Dia de vencimento deve ser entre 1 e 28")
        return v


class ContratoStatusUpdate(BaseModel):
    status: Literal["rascunho", "ativo", "encerrado", "rescindido"]


class ContratoOut(BaseModel):
    id: int
    contratante_id: int
    tipo: str = "formal"
    curso: str
    valor_mensalidade: Decimal
    desconto_percentual: Optional[Decimal] = None
    desconto_valor: Optional[Decimal] = None
    dia_vencimento: int
    valor_reposicao_hora: Decimal
    data_inicio: date
    data_fim: date
    data_assinatura: Optional[date] = None
    local_assinatura: Optional[str] = None
    observacoes: Optional[str] = None
    status: str
    contrato_assinado_key: Optional[str] = None
    created_at: datetime
    alunos: list[AlunoOut]
    contratante: PessoaOut

    model_config = ConfigDict(from_attributes=True)


class ContratoListOut(BaseModel):
    items: list[ContratoOut]
    total: int
    page: int
    page_size: int
