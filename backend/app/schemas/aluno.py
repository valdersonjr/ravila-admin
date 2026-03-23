import re
from datetime import date
from typing import Optional, Literal

from pydantic import BaseModel, ConfigDict, field_validator

from app.schemas.pessoa import PessoaOut
from app.schemas.nivel import NivelOut

_ANIVERSARIO_RE = re.compile(r"^(0[1-9]|[12]\d|3[01])/(0[1-9]|1[0-2])$")


class AlunoCreate(BaseModel):
    pessoa_id: int
    nivel_id: Optional[int] = None
    responsavel_id: Optional[int] = None
    status: Literal["ativo", "inativo"] = "ativo"
    aniversario: Optional[str] = None
    data_nascimento: Optional[date] = None

    @field_validator("aniversario", mode="before")
    @classmethod
    def validate_aniversario(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        if not _ANIVERSARIO_RE.match(v):
            raise ValueError("aniversario deve estar no formato DD/MM (ex: 24/10)")
        return v


class AlunoUpdate(BaseModel):
    nivel_id: Optional[int] = None
    responsavel_id: Optional[int] = None
    status: Optional[Literal["ativo", "inativo"]] = None
    aniversario: Optional[str] = None
    data_nascimento: Optional[date] = None

    @field_validator("aniversario", mode="before")
    @classmethod
    def validate_aniversario(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        if not _ANIVERSARIO_RE.match(v):
            raise ValueError("aniversario deve estar no formato DD/MM (ex: 24/10)")
        return v


class AlunoOut(BaseModel):
    pessoa_id: int
    nivel_id: Optional[int] = None
    responsavel_id: Optional[int] = None
    status: str
    aniversario: Optional[str] = None
    data_nascimento: Optional[date] = None
    pessoa: PessoaOut
    nivel: Optional[NivelOut] = None
    responsavel: Optional[PessoaOut] = None

    model_config = ConfigDict(from_attributes=True)


class AlunoListOut(BaseModel):
    items: list[AlunoOut]
    total: int
    page: int
    page_size: int
