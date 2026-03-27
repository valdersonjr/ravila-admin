from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, field_validator

from app.models.questao import NIVEIS_CEFR, SUBTIPOS_QUESTAO, ESTILOS_QUESTAO


class QuestaoCreate(BaseModel):
    enunciado: str
    nivel: str
    subtipo: str
    estilo: str
    texto_apoio: Optional[str] = None
    midia_url: Optional[str] = None
    alternativas: Optional[list[str]] = None
    resposta_correta: str
    explicacao: Optional[str] = None

    @field_validator("nivel")
    @classmethod
    def validar_nivel(cls, v: str) -> str:
        if v not in NIVEIS_CEFR:
            raise ValueError(f"nivel deve ser um de {NIVEIS_CEFR}")
        return v

    @field_validator("subtipo")
    @classmethod
    def validar_subtipo(cls, v: str) -> str:
        if v not in SUBTIPOS_QUESTAO:
            raise ValueError(f"subtipo deve ser um de {SUBTIPOS_QUESTAO}")
        return v

    @field_validator("estilo")
    @classmethod
    def validar_estilo(cls, v: str) -> str:
        if v not in ESTILOS_QUESTAO:
            raise ValueError(f"estilo deve ser um de {ESTILOS_QUESTAO}")
        return v


class QuestaoUpdate(BaseModel):
    enunciado: Optional[str] = None
    nivel: Optional[str] = None
    subtipo: Optional[str] = None
    estilo: Optional[str] = None
    texto_apoio: Optional[str] = None
    midia_url: Optional[str] = None
    alternativas: Optional[list[str]] = None
    resposta_correta: Optional[str] = None
    explicacao: Optional[str] = None
    ativo: Optional[bool] = None


class QuestaoOut(BaseModel):
    id: int
    enunciado: str
    nivel: str
    subtipo: str
    estilo: str
    texto_apoio: Optional[str]
    midia_url: Optional[str]
    alternativas: Optional[list[str]]
    resposta_correta: str
    explicacao: Optional[str]
    ativo: bool
    criado_em: datetime

    model_config = {"from_attributes": True}


# Versão para o portal — sem expor a resposta correta
class QuestaoPortalOut(BaseModel):
    id: int
    enunciado: str
    nivel: str
    subtipo: str
    estilo: str
    texto_apoio: Optional[str]
    midia_url: Optional[str]
    alternativas: Optional[list[str]]

    model_config = {"from_attributes": True}


class QuestaoRespostaCreate(BaseModel):
    resposta_dada: str


class QuestaoRespostaOut(BaseModel):
    acertou: bool
    resposta_correta: str
    explicacao: Optional[str]
    streak: int


class QuestaoAlunoDiaOut(BaseModel):
    data: date
    respondida: bool
    questao: QuestaoPortalOut

    model_config = {"from_attributes": True}
