from datetime import datetime, date
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict


class AulaCreate(BaseModel):
    turma_id: int
    data: date
    hora_inicio: str  # HH:MM
    hora_fim: str     # HH:MM
    professor_id: int
    tipo: Literal["regular", "substitutiva"] = "regular"


class AulaStatusUpdate(BaseModel):
    status: Literal["agendada", "realizada", "cancelada"]


class AulaRemarcarRequest(BaseModel):
    data: date
    hora_inicio: str  # HH:MM
    hora_fim: str     # HH:MM


class AulaSubstituirProfessorRequest(BaseModel):
    professor_id: int


class AulaDescricaoUpdate(BaseModel):
    descricao: Optional[str] = None


class TurmaSimples(BaseModel):
    id: int
    nome: str
    professor_id: int

    model_config = ConfigDict(from_attributes=True)


class AulaOut(BaseModel):
    id: int
    turma_id: int
    data: date
    hora_inicio: str
    hora_fim: str
    professor_id: int
    professor_nome_snapshot: str
    tipo: str
    status: str
    aula_origem_id: Optional[int] = None
    descricao: Optional[str] = None
    created_at: datetime
    turma: Optional[TurmaSimples] = None

    model_config = ConfigDict(from_attributes=True)
