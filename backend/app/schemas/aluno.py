from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict

from app.schemas.pessoa import PessoaOut
from app.schemas.nivel import NivelOut


class AlunoCreate(BaseModel):
    pessoa_id: int
    nivel_id: Optional[int] = None
    responsavel_id: Optional[int] = None
    status: Literal["ativo", "inativo"] = "ativo"


class AlunoUpdate(BaseModel):
    nivel_id: Optional[int] = None
    responsavel_id: Optional[int] = None
    status: Optional[Literal["ativo", "inativo"]] = None


class AlunoOut(BaseModel):
    pessoa_id: int
    nivel_id: Optional[int] = None
    responsavel_id: Optional[int] = None
    status: str
    pessoa: PessoaOut
    nivel: Optional[NivelOut] = None
    responsavel: Optional[PessoaOut] = None

    model_config = ConfigDict(from_attributes=True)
