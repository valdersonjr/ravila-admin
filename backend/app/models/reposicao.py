from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import ForeignKey, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.aluno import Aluno
    from app.models.aula import Aula


class ReposicaoPendente(Base):
    __tablename__ = "reposicoes_pendentes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    aluno_id: Mapped[int] = mapped_column(ForeignKey("pessoas.id"), nullable=False)
    aula_origem_id: Mapped[int] = mapped_column(ForeignKey("aulas.id"), nullable=False)
    aula_reposicao_id: Mapped[Optional[int]] = mapped_column(ForeignKey("aulas.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pendente")  # pendente | usada
    criada_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    aluno: Mapped["Aluno"] = relationship(
        "Aluno", primaryjoin="ReposicaoPendente.aluno_id == foreign(Aluno.pessoa_id)", viewonly=True
    )
    aula_origem: Mapped["Aula"] = relationship("Aula", foreign_keys=[aula_origem_id])
    aula_reposicao: Mapped[Optional["Aula"]] = relationship("Aula", foreign_keys=[aula_reposicao_id])
