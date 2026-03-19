from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.repositories import user as user_repo
from app.repositories import pessoa as pessoa_repo
from app.schemas.user import UserCreate, UserUpdate


def listar(db: Session, role: str | None = None) -> list[User]:
    return user_repo.listar(db, role)


def buscar(db: Session, pessoa_id: int) -> User:
    user = user_repo.buscar_por_pessoa_id(db, pessoa_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )
    return user


def criar(db: Session, dados: UserCreate) -> User:
    pessoa = pessoa_repo.buscar_por_id(db, dados.pessoa_id)
    if not pessoa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pessoa não encontrada",
        )
    if user_repo.buscar_por_pessoa_id(db, dados.pessoa_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta pessoa já possui um usuário",
        )
    payload = {
        "pessoa_id": dados.pessoa_id,
        "senha_hash": hash_password(dados.senha),
        "role": dados.role,
        "ativo": True,
    }
    return user_repo.criar(db, payload)


def atualizar(db: Session, pessoa_id: int, dados: UserUpdate) -> User:
    user = buscar(db, pessoa_id)
    data = dados.model_dump(exclude_unset=True)
    if "senha" in data:
        user.senha_hash = hash_password(data.pop("senha"))
    return user_repo.atualizar(db, user, data)
