from sqlalchemy.orm import Session

from app.models.pessoa import Pessoa


def listar(
    db: Session,
    search: str | None = None,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[Pessoa], int]:
    query = db.query(Pessoa)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            (Pessoa.nome.ilike(pattern)) | (Pessoa.cpf.ilike(pattern))
        )
    total = query.count()
    items = query.order_by(Pessoa.nome).offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def buscar_por_id(db: Session, id: int) -> Pessoa | None:
    return db.query(Pessoa).filter(Pessoa.id == id).first()


def buscar_por_cpf(db: Session, cpf: str) -> Pessoa | None:
    return db.query(Pessoa).filter(Pessoa.cpf == cpf).first()


def criar(db: Session, dados: dict) -> Pessoa:
    pessoa = Pessoa(**dados)
    db.add(pessoa)
    db.commit()
    db.refresh(pessoa)
    return pessoa


def atualizar(db: Session, pessoa: Pessoa, dados: dict) -> Pessoa:
    for key, value in dados.items():
        setattr(pessoa, key, value)
    db.commit()
    db.refresh(pessoa)
    return pessoa
