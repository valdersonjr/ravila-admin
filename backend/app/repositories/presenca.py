from sqlalchemy.orm import Session, selectinload, joinedload

from app.models.aluno import Aluno
from app.models.aula import Aula
from app.models.presenca import Presenca
from app.models.turma import Turma


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


def listar_por_aluno(db: Session, aluno_id: int, page: int = 1, page_size: int = 20) -> tuple[list[Presenca], int]:
    query = (
        db.query(Presenca)
        .join(Aula, Aula.id == Presenca.aula_id)
        .filter(Presenca.aluno_id == aluno_id)
        .options(joinedload(Presenca.aula).joinedload(Aula.turma))
        .order_by(Aula.data.desc())
    )
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return items, total


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
