from sqlalchemy.orm import Session

from app.models.user import User


def listar(db: Session, role: str | None = None) -> list[User]:
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.all()


def buscar_por_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def buscar_por_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(User.username == username).first()


def buscar_por_pessoa_id(db: Session, pessoa_id: int) -> User | None:
    return db.query(User).filter(User.pessoa_id == pessoa_id).first()


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


def deletar(db: Session, user: User) -> None:
    db.delete(user)
    db.commit()
