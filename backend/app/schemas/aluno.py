import re
from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.pessoa import PessoaOut
from app.schemas.nivel import NivelOut
from app.schemas.matricula import MatriculaOut

_ANIVERSARIO_RE = re.compile(r"^(0[1-9]|[12]\d|3[01])/(0[1-9]|1[0-2])$")


class AlunoCreate(BaseModel):
    pessoa_id: int
    nivel_id: Optional[int] = None
    responsavel_id: Optional[int] = None
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


_NIVEIS_CEFR = {"A1", "A2", "B1", "B2", "C1", "C2"}


class AlunoUpdate(BaseModel):
    nivel_id: Optional[int] = None
    responsavel_id: Optional[int] = None
    aniversario: Optional[str] = None
    data_nascimento: Optional[date] = None
    nivel_questao: Optional[str] = None

    @field_validator("aniversario", mode="before")
    @classmethod
    def validate_aniversario(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        if not _ANIVERSARIO_RE.match(v):
            raise ValueError("aniversario deve estar no formato DD/MM (ex: 24/10)")
        return v

    @field_validator("nivel_questao", mode="before")
    @classmethod
    def validate_nivel_questao(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        if v not in _NIVEIS_CEFR:
            raise ValueError(f"nivel_questao deve ser um dos: {sorted(_NIVEIS_CEFR)}")
        return v


class AlunoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    pessoa_id: int
    nivel_id: Optional[int] = None
    responsavel_id: Optional[int] = None
    status: str = Field(validation_alias="status_calculado")
    tem_contrato_ativo: bool = Field(validation_alias="tem_contrato_ativo")
    aniversario: Optional[str] = None
    data_nascimento: Optional[date] = None
    nivel_questao: Optional[str] = None
    pessoa: PessoaOut
    nivel: Optional[NivelOut] = None
    responsavel: Optional[PessoaOut] = None
    matriculas: list[MatriculaOut] = []


class AlunoListOut(BaseModel):
    items: list[AlunoOut]
    total: int
    page: int
    page_size: int
