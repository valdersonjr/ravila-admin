from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class AulaSimples(BaseModel):
    id: int
    data: date
    hora_inicio: str
    hora_fim: str
    turma_id: int

    model_config = ConfigDict(from_attributes=True)


class AlunoSimples(BaseModel):
    pessoa_id: int
    pessoa: "PessoaSimples"

    model_config = ConfigDict(from_attributes=True)


class PessoaSimples(BaseModel):
    id: int
    nome: str
    cpf: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


AlunoSimples.model_rebuild()


class ReposicaoPendenteOut(BaseModel):
    id: int
    aluno_id: int
    aula_origem_id: int
    aula_reposicao_id: Optional[int] = None
    status: str
    criada_em: datetime
    aluno: Optional[AlunoSimples] = None
    aula_origem: Optional[AulaSimples] = None

    model_config = ConfigDict(from_attributes=True)
