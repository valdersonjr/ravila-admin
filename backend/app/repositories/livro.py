from sqlalchemy.orm import Session

from app.models.livro import Livro


def listar(db: Session, include_inactive: bool = False) -> list[Livro]:
    query = db.query(Livro)
    if not include_inactive:
        query = query.filter(Livro.ativo == True)
    return query.order_by(Livro.ordem, Livro.titulo).all()


def buscar_por_id(db: Session, id: int) -> Livro | None:
    return db.query(Livro).filter(Livro.id == id).first()


def criar(db: Session, dados: dict) -> Livro:
    livro = Livro(**dados)
    db.add(livro)
    db.commit()
    db.refresh(livro)
    return livro


def atualizar(db: Session, livro: Livro, dados: dict) -> Livro:
    for key, value in dados.items():
        setattr(livro, key, value)
    db.commit()
    db.refresh(livro)
    return livro
