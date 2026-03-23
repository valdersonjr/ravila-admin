import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator


def clean_cpf(cpf: str) -> str:
    return re.sub(r"[.\-]", "", cpf)


class PessoaBase(BaseModel):
    nome: str
    cpf: Optional[str] = None
    rg: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    menor_de_idade: bool = False

    @field_validator("cpf", mode="before")
    @classmethod
    def normalize_cpf(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        return clean_cpf(v)



class PessoaCreate(PessoaBase):
    pass


class PessoaUpdate(BaseModel):
    nome: Optional[str] = None
    cpf: Optional[str] = None
    rg: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
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


class PessoaListOut(BaseModel):
    items: list[PessoaOut]
    total: int
    page: int
    page_size: int
