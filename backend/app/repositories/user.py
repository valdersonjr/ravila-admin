from sqlalchemy.orm import Session

from app.models.user import User


def listar(db: Session, role: str | None = None) -> list[User]:
    query = db.query(User)
    if role == "admin":
        query = query.filter(User.is_admin == True)
    elif role == "secretario":
        query = query.filter(User.is_secretario == True, User.is_admin == False)
    elif role == "professor":
        query = query.filter(User.is_admin == False, User.is_secretario == False)
    return query.all()


def buscar_por_pessoa_id(db: Session, pessoa_id: int) -> User | None:
    return db.query(User).filter(User.pessoa_id == pessoa_id).first()


def buscar_por_cpf(db: Session, cpf: str) -> User | None:
    return db.query(User).filter(User.pessoa.has(cpf=cpf)).first()


def criar(db: Session, dados: dict) -> User:
    user = User(**dados)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def atualizar(db: Session, user: User, dados: dict) -> User:
    for key, value in dados.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user
