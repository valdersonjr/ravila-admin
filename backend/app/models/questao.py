from datetime import date, datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, Boolean, Date, DateTime, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    pass

NIVEIS_CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"]
SUBTIPOS_QUESTAO = ["multiple_choice", "fill_blanks", "dissertativa", "redacao"]
SUBTIPOS_AUTO = {"multiple_choice", "fill_blanks"}      # corrigidos automaticamente
SUBTIPOS_MANUAL = {"dissertativa", "redacao"}           # exigem correção do professor
CONTEXTOS_QUESTAO = ["casual", "vestibular", "toefl_ielts", "avaliacao"]
TOPICOS_QUESTAO = ["grammar", "vocabulary", "reading", "listening", "writing", "speaking", "pronunciation"]
DIFICULDADES_QUESTAO = ["easy", "medium", "hard"]


class Questao(Base):
    __tablename__ = "questoes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    codigo: Mapped[str] = mapped_column(String(8), nullable=False, unique=True, index=True)
    enunciado: Mapped[str] = mapped_column(Text, nullable=False)
    nivel: Mapped[str] = mapped_column(String(5), nullable=False, index=True)
    subtipo: Mapped[str] = mapped_column(String(20), nullable=False)
    contexto: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    topico: Mapped[str] = mapped_column(String(20), nullable=False, index=True, server_default="grammar")
    dificuldade: Mapped[str] = mapped_column(String(10), nullable=False, index=True, server_default="medium")

    # Texto de apoio (opcional) — trecho, charge, contexto da questão
    texto_apoio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # URL e tipo de mídia de apoio (opcional)
    midia_url: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    midia_tipo: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # image | audio | video

    # Apenas para multiple_choice: lista de opções ex: ["goes", "go", "going", "went"]
    alternativas: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # multiple_choice: texto da opção correta
    # fill_blanks: respostas aceitas separadas por | ex: "goes|go"
    # multiple_choice/fill_blanks: gabarito obrigatório
    # dissertativa/redacao: gabarito opcional (rubrica de referência para o professor)
    resposta_correta: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Explicação exibida após o aluno responder
    explicacao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    criado_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    respostas: Mapped[list["QuestaoResposta"]] = relationship("QuestaoResposta", back_populates="questao")
    diarias: Mapped[list["QuestaoAlunoDia"]] = relationship("QuestaoAlunoDia", back_populates="questao")


class QuestaoAlunoDia(Base):
    """Registra qual questão foi sorteada para cada aluno em cada dia."""
    __tablename__ = "questao_diaria"
    __table_args__ = (UniqueConstraint("aluno_id", "data", name="uq_questao_diaria_aluno_data"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    aluno_id: Mapped[int] = mapped_column(ForeignKey("alunos.pessoa_id"), nullable=False, index=True)
    questao_id: Mapped[int] = mapped_column(ForeignKey("questoes.id"), nullable=False)
    data: Mapped[date] = mapped_column(Date, nullable=False)
    respondida: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    respondida_em: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    questao: Mapped["Questao"] = relationship("Questao", back_populates="diarias")


class QuestaoResposta(Base):
    """Todas as respostas dadas pelo aluno (questão diária e banco livre)."""
    __tablename__ = "questao_respostas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    aluno_id: Mapped[int] = mapped_column(ForeignKey("alunos.pessoa_id"), nullable=False, index=True)
    questao_id: Mapped[int] = mapped_column(ForeignKey("questoes.id"), nullable=False)
    resposta_dada: Mapped[str] = mapped_column(String(500), nullable=False)
    acertou: Mapped[bool] = mapped_column(Boolean, nullable=False)
    origem: Mapped[str] = mapped_column(String(20), nullable=False)  # "diaria" | "banco" | "proficiencia" | "avaliacao"
    respondida_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    questao: Mapped["Questao"] = relationship("Questao", back_populates="respostas")
