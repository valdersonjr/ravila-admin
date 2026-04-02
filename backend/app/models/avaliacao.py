from datetime import date, datetime, time
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, Boolean, Date, DateTime, Float, ForeignKey, Text, UniqueConstraint, Integer, Time, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.questao import Questao
    from app.models.turma import Turma

STATUS_AVALIACAO = ["rascunho", "publicada", "encerrada"]
STATUS_ALUNO = ["aguardando_correcao", "concluida"]


class Avaliacao(Base):
    __tablename__ = "avaliacoes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    topico: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    modulo: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    turma_id: Mapped[int] = mapped_column(ForeignKey("turmas.id"), nullable=False, index=True)
    aula_id: Mapped[Optional[int]] = mapped_column(ForeignKey("aulas.id", ondelete="SET NULL"), nullable=True, index=True)
    data_aplicacao: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    hora_inicio: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    hora_fim: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="rascunho")
    criado_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    turma: Mapped["Turma"] = relationship("Turma")
    questoes: Mapped[list["AvaliacaoQuestao"]] = relationship(
        "AvaliacaoQuestao", back_populates="avaliacao",
        order_by="AvaliacaoQuestao.ordem", cascade="all, delete-orphan",
    )
    alunos: Mapped[list["AvaliacaoAluno"]] = relationship(
        "AvaliacaoAluno", back_populates="avaliacao", cascade="all, delete-orphan",
    )


class AvaliacaoQuestao(Base):
    __tablename__ = "avaliacao_questoes"
    __table_args__ = (UniqueConstraint("avaliacao_id", "questao_id", name="uq_avaliacao_questao"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    avaliacao_id: Mapped[int] = mapped_column(ForeignKey("avaliacoes.id", ondelete="CASCADE"), nullable=False, index=True)
    questao_id: Mapped[int] = mapped_column(ForeignKey("questoes.id"), nullable=False)
    ordem: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    peso: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)

    avaliacao: Mapped["Avaliacao"] = relationship("Avaliacao", back_populates="questoes")
    questao: Mapped["Questao"] = relationship("Questao")


class AvaliacaoResposta(Base):
    __tablename__ = "avaliacao_respostas"
    __table_args__ = (UniqueConstraint("avaliacao_id", "aluno_id", "questao_id", name="uq_avaliacao_resposta"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    avaliacao_id: Mapped[int] = mapped_column(ForeignKey("avaliacoes.id", ondelete="CASCADE"), nullable=False, index=True)
    aluno_id: Mapped[int] = mapped_column(ForeignKey("alunos.pessoa_id"), nullable=False, index=True)
    questao_id: Mapped[int] = mapped_column(ForeignKey("questoes.id"), nullable=False)
    resposta_dada: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    acertou: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)   # null = aguardando correção manual
    nota_manual: Mapped[Optional[float]] = mapped_column(Float, nullable=True) # 0.0–1.0
    comentario_professor: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    corrigida: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    respondida_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    questao: Mapped["Questao"] = relationship("Questao")


class AvaliacaoAluno(Base):
    """Registro de participação de um aluno em uma avaliação."""
    __tablename__ = "avaliacao_alunos"
    __table_args__ = (UniqueConstraint("avaliacao_id", "aluno_id", name="uq_avaliacao_aluno"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    avaliacao_id: Mapped[int] = mapped_column(ForeignKey("avaliacoes.id", ondelete="CASCADE"), nullable=False, index=True)
    aluno_id: Mapped[int] = mapped_column(ForeignKey("alunos.pessoa_id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, server_default="aguardando_correcao")
    nota_final: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # 0–100
    iniciado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    concluido_em: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    avaliacao: Mapped["Avaliacao"] = relationship("Avaliacao", back_populates="alunos")
