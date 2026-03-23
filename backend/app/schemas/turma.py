from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict

from app.schemas.livro import LivroOut
from app.schemas.professor import ProfessorOut


class HorarioTurmaCreate(BaseModel):
    dia_semana: int  # 0=Mon, 6=Sun
    hora_inicio: str  # HH:MM
    hora_fim: str     # HH:MM


class HorarioTurmaOut(BaseModel):
    id: int
    turma_id: int
    dia_semana: int
    hora_inicio: str
    hora_fim: str

    model_config = ConfigDict(from_attributes=True)


class TurmaCreate(BaseModel):
    nome: str
    livro_id: Optional[int] = None
    professor_id: int
    status: Literal["ativa", "encerrada"] = "ativa"


class TurmaUpdate(BaseModel):
    nome: Optional[str] = None
    livro_id: Optional[int] = None
    professor_id: Optional[int] = None
    status: Optional[Literal["ativa", "encerrada"]] = None


class TurmaOut(BaseModel):
    id: int
    nome: str
    livro_id: Optional[int] = None
    professor_id: int
    status: str
    created_at: datetime
    livro: Optional[LivroOut] = None
    professor: ProfessorOut
    horarios: list[HorarioTurmaOut] = []

    model_config = ConfigDict(from_attributes=True)


class GerarAulasRequest(BaseModel):
    data_inicio: str  # YYYY-MM-DD
    data_fim: str     # YYYY-MM-DD


class GerarAulasResponse(BaseModel):
    aulas_criadas: int


class GerarSemanaRequest(BaseModel):
    dry_run: bool = True


class GerarSemanaItem(BaseModel):
    turma_id: int
    turma_nome: str
    professor_nome: str
    aulas_a_criar: int
    sem_horario: bool
    conflitos: list[str]


class GerarSemanaRelatorio(BaseModel):
    data_inicio: str
    data_fim: str
    itens: list[GerarSemanaItem]
    total_aulas: int
