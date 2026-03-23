from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.livro import Livro
from app.repositories import livro as livro_repo
from app.schemas.livro import LivroCreate, LivroUpdate


def listar(db: Session, include_inactive: bool = False) -> list[Livro]:
    return livro_repo.listar(db, include_inactive)


def buscar(db: Session, id: int) -> Livro:
    livro = livro_repo.buscar_por_id(db, id)
    if not livro:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Livro não encontrado")
    return livro


def criar(db: Session, dados: LivroCreate) -> Livro:
    return livro_repo.criar(db, dados.model_dump())


def atualizar(db: Session, id: int, dados: LivroUpdate) -> Livro:
    livro = buscar(db, id)
    return livro_repo.atualizar(db, livro, dados.model_dump(exclude_unset=True))
