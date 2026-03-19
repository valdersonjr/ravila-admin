from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.nivel import Nivel
from app.repositories import nivel as nivel_repo
from app.schemas.nivel import NivelCreate, NivelUpdate


def listar(db: Session, include_inactive: bool = False) -> list[Nivel]:
    return nivel_repo.listar(db, include_inactive)


def buscar(db: Session, id: int) -> Nivel:
    nivel = nivel_repo.buscar_por_id(db, id)
    if not nivel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nível não encontrado",
        )
    return nivel


def criar(db: Session, dados: NivelCreate) -> Nivel:
    return nivel_repo.criar(db, dados.model_dump())


def atualizar(db: Session, id: int, dados: NivelUpdate) -> Nivel:
    nivel = buscar(db, id)
    return nivel_repo.atualizar(db, nivel, dados.model_dump(exclude_unset=True))


def deletar(db: Session, id: int) -> None:
    nivel = buscar(db, id)
    nivel_repo.atualizar(db, nivel, {"ativo": False})
