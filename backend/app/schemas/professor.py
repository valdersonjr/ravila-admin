from typing import Optional
from pydantic import BaseModel, ConfigDict

from app.schemas.pessoa import PessoaOut


class ProfessorCreate(BaseModel):
    pessoa_id: int


class ProfessorUpdate(BaseModel):
    ativo: Optional[bool] = None


class ProfessorOut(BaseModel):
    pessoa_id: int
    ativo: bool
    pessoa: PessoaOut

    model_config = ConfigDict(from_attributes=True)


# ── Dashboard ─────────────────────────────────────────────────────────────────

class TurmaDashboard(BaseModel):
    id: int
    nome: str
    status: str
    num_alunos: int


class AulasMes(BaseModel):
    realizadas: int
    agendadas: int
    canceladas: int
    presenca_media: Optional[float] = None


class AulasStats(BaseModel):
    total: int
    realizadas: int
    canceladas: int
    agendadas: int
    mes_atual: AulasMes


class MesHistorico(BaseModel):
    mes: str          # MM/YYYY
    realizadas: int
    canceladas: int
    presenca_media: Optional[float] = None


class ProfessorDashboardOut(BaseModel):
    professor_id: int
    nome: str
    cpf: Optional[str] = None
    ativo: bool
    turmas: list[TurmaDashboard]
    aulas: AulasStats
    presenca_media: Optional[float] = None
    historico_mensal: list[MesHistorico]
