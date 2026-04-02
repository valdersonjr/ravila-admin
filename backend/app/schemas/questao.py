from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, field_validator

from app.models.questao import NIVEIS_CEFR, SUBTIPOS_QUESTAO, CONTEXTOS_QUESTAO, TOPICOS_QUESTAO, DIFICULDADES_QUESTAO, SUBTIPOS_MANUAL


class QuestaoCreate(BaseModel):
    enunciado: str
    nivel: str
    subtipo: str
    contexto: str
    topico: str
    dificuldade: str = "medium"
    texto_apoio: Optional[str] = None
    midia_url: Optional[str] = None
    midia_tipo: Optional[str] = None
    alternativas: Optional[list[str]] = None
    resposta_correta: Optional[str] = None   # obrigatório para auto, rubrica opcional para manual
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

    @field_validator("contexto")
    @classmethod
    def validar_contexto(cls, v: str) -> str:
        if v not in CONTEXTOS_QUESTAO:
            raise ValueError(f"contexto deve ser um de {CONTEXTOS_QUESTAO}")
        return v

    @field_validator("topico")
    @classmethod
    def validar_topico(cls, v: str) -> str:
        if v not in TOPICOS_QUESTAO:
            raise ValueError(f"topico deve ser um de {TOPICOS_QUESTAO}")
        return v

    @field_validator("dificuldade")
    @classmethod
    def validar_dificuldade(cls, v: str) -> str:
        if v not in DIFICULDADES_QUESTAO:
            raise ValueError(f"dificuldade deve ser um de {DIFICULDADES_QUESTAO}")
        return v

    @field_validator("midia_tipo")
    @classmethod
    def validar_midia_tipo(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("image", "audio", "video"):
            raise ValueError("midia_tipo deve ser image, audio ou video")
        return v


class QuestaoUpdate(BaseModel):
    enunciado: Optional[str] = None
    nivel: Optional[str] = None
    subtipo: Optional[str] = None
    contexto: Optional[str] = None
    topico: Optional[str] = None
    dificuldade: Optional[str] = None
    texto_apoio: Optional[str] = None
    midia_url: Optional[str] = None
    midia_tipo: Optional[str] = None
    alternativas: Optional[list[str]] = None
    resposta_correta: Optional[str] = None
    explicacao: Optional[str] = None
    ativo: Optional[bool] = None


class QuestaoOut(BaseModel):
    id: int
    codigo: str
    enunciado: str
    nivel: str
    subtipo: str
    contexto: str
    topico: str
    dificuldade: str
    texto_apoio: Optional[str]
    midia_url: Optional[str]
    midia_tipo: Optional[str]
    alternativas: Optional[list[str]]
    resposta_correta: Optional[str]
    explicacao: Optional[str]
    criado_por_id: Optional[int]
    ativo: bool
    criado_em: datetime

    model_config = {"from_attributes": True}


# Versão para o portal — sem expor a resposta correta
class QuestaoPortalOut(BaseModel):
    id: int
    enunciado: str
    nivel: str
    subtipo: str
    contexto: str
    topico: str
    texto_apoio: Optional[str]
    midia_url: Optional[str]
    midia_tipo: Optional[str]
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
