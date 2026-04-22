from datetime import date, datetime, time
from typing import Optional

from pydantic import BaseModel, field_validator

from app.models.avaliacao import STATUS_AVALIACAO
from app.models.questao import TOPICOS_QUESTAO
from app.schemas.questao import QuestaoOut


# ── Admin ─────────────────────────────────────────────────────────────────────

class AvaliacaoQuestaoIn(BaseModel):
    questao_id: int
    ordem: int = 0
    peso: float = 1.0

    @field_validator("peso")
    @classmethod
    def validar_peso(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("peso deve ser maior que zero")
        return v


class AvaliacaoCreate(BaseModel):
    titulo: str
    topicos: list[str]
    modulo: Optional[str] = None
    descricao: Optional[str] = None
    tipo: str = "online"
    turma_id: int
    aula_id: Optional[int] = None
    data_aplicacao: Optional[date] = None
    hora_inicio: Optional[time] = None
    hora_fim: Optional[time] = None
    questoes: list[AvaliacaoQuestaoIn] = []

    @field_validator("topicos")
    @classmethod
    def validar_topicos(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("Informe pelo menos um tópico")
        for t in v:
            if t not in TOPICOS_QUESTAO:
                raise ValueError(f"topico '{t}' inválido, deve ser um de {TOPICOS_QUESTAO}")
        return v


class AvaliacaoUpdate(BaseModel):
    titulo: Optional[str] = None
    topicos: Optional[list[str]] = None
    modulo: Optional[str] = None
    descricao: Optional[str] = None
    tipo: Optional[str] = None
    aula_id: Optional[int] = None
    data_aplicacao: Optional[date] = None
    hora_inicio: Optional[time] = None
    hora_fim: Optional[time] = None


class AvaliacaoQuestaoOut(BaseModel):
    id: int
    questao_id: int
    ordem: int
    peso: float
    questao: QuestaoOut

    model_config = {"from_attributes": True}


class AvaliacaoOut(BaseModel):
    id: int
    titulo: str
    topicos: list[str]
    modulo: Optional[str]
    descricao: Optional[str]
    tipo: str = "online"
    turma_id: int
    turma_nome: Optional[str] = None
    aula_id: Optional[int] = None
    aula_data: Optional[date] = None
    aula_hora_inicio: Optional[str] = None
    aula_hora_fim: Optional[str] = None
    data_aplicacao: Optional[date]
    hora_inicio: Optional[time] = None
    hora_fim: Optional[time] = None
    status: str
    criado_por_id: Optional[int]
    criado_em: datetime
    questoes: list[AvaliacaoQuestaoOut] = []
    total_alunos: int = 0
    total_pendentes: int = 0
    tem_documento: bool = False

    model_config = {"from_attributes": True}


class AvaliacaoListOut(BaseModel):
    id: int
    titulo: str
    topicos: list[str]
    modulo: Optional[str]
    tipo: str = "online"
    turma_id: int
    turma_nome: Optional[str] = None
    aula_id: Optional[int] = None
    data_aplicacao: Optional[date]
    hora_inicio: Optional[time] = None
    hora_fim: Optional[time] = None
    status: str
    criado_em: datetime
    total_questoes: int = 0
    total_alunos: int = 0
    tem_documento: bool = False

    model_config = {"from_attributes": True}


class AvaliacaoAlunoOut(BaseModel):
    aluno_id: int
    nome: str
    status: str          # aguardando_correcao | concluida
    nota_final: Optional[float]
    iniciado_em: datetime
    concluido_em: Optional[datetime]

    model_config = {"from_attributes": True}


class CorrecaoIn(BaseModel):
    nota_manual: float   # 0.0–1.0
    comentario_professor: Optional[str] = None

    @field_validator("nota_manual")
    @classmethod
    def validar_nota(cls, v: float) -> float:
        if not (0.0 <= v <= 1.0):
            raise ValueError("nota_manual deve estar entre 0.0 e 1.0")
        return v


class RespostaAlunoOut(BaseModel):
    questao_id: int
    codigo: str
    enunciado: str
    subtipo: str
    peso: float
    resposta_dada: Optional[str]
    acertou: Optional[bool]
    nota_manual: Optional[float]
    comentario_professor: Optional[str]
    corrigida: bool

    model_config = {"from_attributes": True}


class NotaAlunoIn(BaseModel):
    aluno_id: int
    nota: Optional[float]  # 0–100; None remove o registro

    @field_validator("nota")
    @classmethod
    def validar_nota(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (0.0 <= v <= 100.0):
            raise ValueError("nota deve estar entre 0 e 100")
        return v


class LancarNotasIn(BaseModel):
    notas: list[NotaAlunoIn]


class AvaliacaoDesempenhoAlunoOut(BaseModel):
    id: int
    titulo: str
    turma_id: int
    turma_nome: Optional[str] = None
    data_aplicacao: Optional[date]
    status: str
    total_questoes: int
    status_aluno: str
    nota_final: Optional[float]

    model_config = {"from_attributes": True}


# ── Portal ────────────────────────────────────────────────────────────────────

class AvaliacaoPortalOut(BaseModel):
    id: int
    titulo: str
    topicos: list[str]
    modulo: Optional[str]
    descricao: Optional[str]
    data_aplicacao: Optional[date]
    hora_inicio: Optional[time] = None
    hora_fim: Optional[time] = None
    disponivel: bool = True       # dentro da janela de tempo
    status_aluno: Optional[str]   # aguardando_correcao | concluida | None (não iniciada)
    nota_final: Optional[float]
    total_questoes: int

    model_config = {"from_attributes": True}


class AvaliacaoDetalhePortalOut(BaseModel):
    id: int
    titulo: str
    topicos: list[str]
    modulo: Optional[str]
    descricao: Optional[str]
    data_aplicacao: Optional[date]
    hora_fim: Optional[time] = None

    questoes: list[AvaliacaoQuestaoOut]

    model_config = {"from_attributes": True}


class RespostaSubmissaoIn(BaseModel):
    questao_id: int
    resposta_dada: str


class AvaliacaoRespostaIn(BaseModel):
    respostas: list[RespostaSubmissaoIn]


class ResultadoQuestaoOut(BaseModel):
    questao_id: int
    enunciado: str
    subtipo: str
    nivel: str
    peso: float
    texto_apoio: Optional[str]
    midia_url: Optional[str]
    midia_tipo: Optional[str]
    alternativas: Optional[list[str]]
    resposta_dada: Optional[str]
    resposta_correta: Optional[str]   # gabarito (auto) ou rubrica (manual)
    acertou: Optional[bool]
    nota_manual: Optional[float]      # 0.0–1.0
    comentario_professor: Optional[str]
    explicacao: Optional[str]
    corrigida: bool


class ResultadoAvaliacaoOut(BaseModel):
    status: str                       # aguardando_correcao | concluida
    nota_final: Optional[float]       # 0–100, só quando concluida
    nota_parcial: Optional[float]     # pontuação das questões já corrigidas (0–100)
    total_peso: float
    peso_corrigido: float             # soma dos pesos já corrigidos
    concluido_em: Optional[datetime]
    questoes: list[ResultadoQuestaoOut]
