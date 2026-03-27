from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, Integer, ForeignKey, DateTime, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.aula import Aula
    from app.models.turma import Turma


class Material(Base):
    __tablename__ = "materiais"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    titulo: Mapped[str] = mapped_column(String(300), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)

    # "pdf" | "link" | "video" | "imagem"
    tipo: Mapped[str] = mapped_column(String(20), nullable=False, default="pdf")

    # "exercicio" | "gramatica" | "vocabulario" | "pronuncia" | "outro"
    categoria: Mapped[str] = mapped_column(String(30), nullable=False, default="outro")

    # Arquivo hospedado no S3 (null quando tipo = "link")
    s3_key: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # URL externa (null quando é arquivo S3)
    url_externa: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)

    # Vinculação opcional à aula (null = material avulso)
    aula_id: Mapped[Optional[int]] = mapped_column(ForeignKey("aulas.id", ondelete="SET NULL"), nullable=True)

    # Visível apenas para alunos desta turma (null + publico=False = só staff/professor)
    turma_id: Mapped[Optional[int]] = mapped_column(ForeignKey("turmas.id", ondelete="SET NULL"), nullable=True)

    # True = visível para todos os alunos da escola
    publico: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    criado_por_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    aula: Mapped[Optional["Aula"]] = relationship("Aula")
    turma: Mapped[Optional["Turma"]] = relationship("Turma")
