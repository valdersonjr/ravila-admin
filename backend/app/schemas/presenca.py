from datetime import date
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict

from app.schemas.aluno import AlunoOut


class PessoaSimples(BaseModel):
    id: int
    nome: str
    cpf: str

    model_config = ConfigDict(from_attributes=True)


class PresencaItem(BaseModel):
    aluno_id: int
    tipo: Literal["matriculado", "experimental", "substituto"]
    presente: bool = False


class PresencaBatchRequest(BaseModel):
    presencas: list[PresencaItem]


class PresencaOut(BaseModel):
    id: int
    aula_id: int
    aluno_id: int
    tipo: str
    presente: bool
    aluno: Optional[AlunoOut] = None
    pessoa: Optional[PessoaSimples] = None

    model_config = ConfigDict(from_attributes=True)


class _TurmaInfo(BaseModel):
    id: int
    nome: str
    model_config = ConfigDict(from_attributes=True)


class _AulaInfo(BaseModel):
    id: int
    data: date
    hora_inicio: str
    hora_fim: str
    tipo: str
    turma: Optional[_TurmaInfo] = None
    model_config = ConfigDict(from_attributes=True)


class PresencaDoAlunoOut(BaseModel):
    id: int
    aula_id: int
    tipo: str
    presente: bool
    aula: _AulaInfo
    model_config = ConfigDict(from_attributes=True)
