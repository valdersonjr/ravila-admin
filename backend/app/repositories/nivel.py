from sqlalchemy.orm import Session

from app.models.nivel import Nivel


def listar(db: Session, include_inactive: bool = False) -> list[Nivel]:
    query = db.query(Nivel)
    if not include_inactive:
        query = query.filter(Nivel.ativo == True)
    return query.order_by(Nivel.ordem).all()


def buscar_por_id(db: Session, id: int) -> Nivel | None:
    return db.query(Nivel).filter(Nivel.id == id).first()


def criar(db: Session, dados: dict) -> Nivel:
    nivel = Nivel(**dados)
    db.add(nivel)
    db.commit()
    db.refresh(nivel)
    return nivel


def atualizar(db: Session, nivel: Nivel, dados: dict) -> Nivel:
    for key, value in dados.items():
        setattr(nivel, key, value)
    db.commit()
    db.refresh(nivel)
    return nivel
