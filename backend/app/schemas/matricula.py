from datetime import date
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict


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

    model_config = ConfigDict(from_attributes=True)
