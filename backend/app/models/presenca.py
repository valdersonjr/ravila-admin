from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.aula import Aula
    from app.models.aluno import Aluno
    from app.models.pessoa import Pessoa


class Presenca(Base):
    __tablename__ = "presencas"
    __table_args__ = (UniqueConstraint("aula_id", "aluno_id", name="uq_presenca_aula_aluno"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    aula_id: Mapped[int] = mapped_column(ForeignKey("aulas.id"), nullable=False)
    aluno_id: Mapped[int] = mapped_column(ForeignKey("pessoas.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)  # matriculado|experimental|substituto
    presente: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    aula: Mapped["Aula"] = relationship("Aula", back_populates="presencas")
    aluno: Mapped[Optional["Aluno"]] = relationship(
        "Aluno",
        primaryjoin="Presenca.aluno_id == foreign(Aluno.pessoa_id)",
        viewonly=True,
    )
    pessoa: Mapped["Pessoa"] = relationship(
        "Pessoa",
        primaryjoin="Presenca.aluno_id == foreign(Pessoa.id)",
        viewonly=True,
    )
