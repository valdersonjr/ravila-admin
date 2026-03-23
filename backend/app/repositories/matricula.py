from sqlalchemy.orm import Session, selectinload

from app.models.aluno import Aluno
from app.models.matricula import Matricula


def listar(
    db: Session,
    aluno_id: int | None = None,
    turma_id: int | None = None,
    status: str | None = None,
) -> list[Matricula]:
    query = (
        db.query(Matricula)
        .options(
            selectinload(Matricula.aluno).selectinload(Aluno.pessoa),
            selectinload(Matricula.turma),
        )
    )
    if aluno_id:
        query = query.filter(Matricula.aluno_id == aluno_id)
    if turma_id:
        query = query.filter(Matricula.turma_id == turma_id)
    if status:
        query = query.filter(Matricula.status == status)
    return query.all()


def buscar_por_id(db: Session, id: int) -> Matricula | None:
    return db.query(Matricula).filter(Matricula.id == id).first()


def buscar_ativa_por_aluno(db: Session, aluno_id: int) -> Matricula | None:
    return (
        db.query(Matricula)
        .filter(Matricula.aluno_id == aluno_id, Matricula.status == "ativa")
        .first()
    )


def criar(db: Session, dados: dict) -> Matricula:
    matricula = Matricula(**dados)
    db.add(matricula)
    db.commit()
    db.refresh(matricula)
    return matricula


def atualizar(db: Session, matricula: Matricula, dados: dict) -> Matricula:
    for key, value in dados.items():
        setattr(matricula, key, value)
    db.commit()
    db.refresh(matricula)
    return matricula
