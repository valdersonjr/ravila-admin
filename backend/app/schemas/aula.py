import re
from datetime import datetime, date
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict, field_validator

_TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def _validate_time(v: str) -> str:
    if not _TIME_RE.match(v):
        raise ValueError("Formato de hora inválido. Use HH:MM (ex: 08:30)")
    return v


class AulaCreate(BaseModel):
    turma_id: int
    data: date
    hora_inicio: str  # HH:MM
    hora_fim: str     # HH:MM
    professor_id: int
    tipo: Literal["regular", "substitutiva"] = "regular"

    @field_validator("hora_inicio", "hora_fim")
    @classmethod
    def validate_time(cls, v: str) -> str:
        return _validate_time(v)


class AulaAvulsaCreate(BaseModel):
    """Aula particular/avulsa — não pertence a nenhuma turma."""
    aluno_id: int
    professor_id: int
    data: date
    hora_inicio: str  # HH:MM
    hora_fim: str     # HH:MM
    descricao: Optional[str] = None

    @field_validator("hora_inicio", "hora_fim")
    @classmethod
    def validate_time(cls, v: str) -> str:
        return _validate_time(v)


class AulaStatusUpdate(BaseModel):
    status: Literal["agendada", "realizada", "cancelada"]


class AulaRemarcarRequest(BaseModel):
    data: date
    hora_inicio: str  # HH:MM
    hora_fim: str     # HH:MM

    @field_validator("hora_inicio", "hora_fim")
    @classmethod
    def validate_time(cls, v: str) -> str:
        return _validate_time(v)


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
    turma_id: Optional[int] = None
    aluno_id: Optional[int] = None
    aluno_nome_snapshot: Optional[str] = None
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


class AulaListOut(BaseModel):
    items: list[AulaOut]
    total: int
    page: int
    page_size: int
