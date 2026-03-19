from datetime import date
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict

from app.schemas.pessoa import PessoaOut


class AlunoSimples(BaseModel):
    pessoa_id: int
    pessoa: PessoaOut
    model_config = ConfigDict(from_attributes=True)


class TurmaSimples(BaseModel):
    id: int
    nome: str
    model_config = ConfigDict(from_attributes=True)


class MatriculaCreate(BaseModel):
    aluno_id: int
    turma_id: int
    data_inicio: date
    data_fim: Optional[date] = None
    status: Literal["ativa", "cancelada", "concluida"] = "ativa"


class MatriculaStatusUpdate(BaseModel):
    status: Literal["ativa", "cancelada", "concluida"]
    data_fim: Optional[date] = None


class MatriculaOut(BaseModel):
    id: int
    aluno_id: int
    turma_id: int
    data_inicio: date
    data_fim: Optional[date] = None
    status: str
    aluno: Optional[AlunoSimples] = None
    turma: Optional[TurmaSimples] = None

    model_config = ConfigDict(from_attributes=True)
