from sqlalchemy.orm import Session

from app.models.professor import Professor


def listar(db: Session) -> list[Professor]:
    return db.query(Professor).all()


def buscar_por_pessoa_id(db: Session, pessoa_id: int) -> Professor | None:
    return db.query(Professor).filter(Professor.pessoa_id == pessoa_id).first()


def criar(db: Session, dados: dict) -> Professor:
    professor = Professor(**dados)
    db.add(professor)
    db.commit()
    db.refresh(professor)
    return professor


def atualizar(db: Session, professor: Professor, dados: dict) -> Professor:
    for key, value in dados.items():
        setattr(professor, key, value)
    db.commit()
    db.refresh(professor)
    return professor
