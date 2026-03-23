from sqlalchemy.orm import Session, selectinload

from app.models.aluno import Aluno
from app.models.presenca import Presenca


def listar_por_aula(db: Session, aula_id: int) -> list[Presenca]:
    return (
        db.query(Presenca)
        .options(
            selectinload(Presenca.aluno).selectinload(Aluno.pessoa),
            selectinload(Presenca.pessoa),
        )
        .filter(Presenca.aula_id == aula_id)
        .all()
    )


def buscar(db: Session, aula_id: int, aluno_id: int) -> Presenca | None:
    return (
        db.query(Presenca)
        .filter(Presenca.aula_id == aula_id, Presenca.aluno_id == aluno_id)
        .first()
    )


def criar(db: Session, dados: dict) -> Presenca:
    presenca = Presenca(**dados)
    db.add(presenca)
    db.commit()
    db.refresh(presenca)
    return presenca


def atualizar(db: Session, presenca: Presenca, dados: dict) -> Presenca:
    for key, value in dados.items():
        setattr(presenca, key, value)
    db.commit()
    db.refresh(presenca)
    return presenca
