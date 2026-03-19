import re
from datetime import datetime, date
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator, model_validator


def clean_cpf(cpf: str) -> str:
    return re.sub(r"[.\-]", "", cpf)


class PessoaBase(BaseModel):
    nome: str
    cpf: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    data_nascimento: Optional[date] = None
    menor_de_idade: bool = False

    @field_validator("cpf", mode="before")
    @classmethod
    def normalize_cpf(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        return clean_cpf(v)

    @model_validator(mode="after")
    def cpf_obrigatorio_para_maiores(self) -> "PessoaBase":
        if not self.menor_de_idade and not self.cpf:
            raise ValueError("CPF é obrigatório para pessoas maiores de idade")
        return self


class PessoaCreate(PessoaBase):
    pass


class PessoaUpdate(BaseModel):
    nome: Optional[str] = None
    cpf: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    data_nascimento: Optional[date] = None
    menor_de_idade: Optional[bool] = None

    @field_validator("cpf", mode="before")
    @classmethod
    def normalize_cpf(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return clean_cpf(v)


class PessoaOut(PessoaBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
