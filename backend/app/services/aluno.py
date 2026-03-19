from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.aluno import Aluno
from app.repositories import aluno as aluno_repo
from app.repositories import pessoa as pessoa_repo
from app.repositories import nivel as nivel_repo
from app.schemas.aluno import AlunoCreate, AlunoUpdate


def listar(
    db: Session,
    status_filter: str | None = None,
    inadimplente: bool | None = None,
) -> list[Aluno]:
    return aluno_repo.listar(db, status_filter, inadimplente)


def buscar(db: Session, pessoa_id: int) -> Aluno:
    aluno = aluno_repo.buscar_por_pessoa_id(db, pessoa_id)
    if not aluno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aluno não encontrado",
        )
    return aluno


def criar(db: Session, dados: AlunoCreate) -> Aluno:
    pessoa = pessoa_repo.buscar_por_id(db, dados.pessoa_id)
    if not pessoa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pessoa não encontrada",
        )
    if aluno_repo.buscar_por_pessoa_id(db, dados.pessoa_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta pessoa já é um aluno",
        )
    if dados.nivel_id:
        nivel = nivel_repo.buscar_por_id(db, dados.nivel_id)
        if not nivel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nível não encontrado",
            )
    if dados.responsavel_id:
        responsavel = pessoa_repo.buscar_por_id(db, dados.responsavel_id)
        if not responsavel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Responsável não encontrado",
            )
    return aluno_repo.criar(db, dados.model_dump())


def atualizar(db: Session, pessoa_id: int, dados: AlunoUpdate) -> Aluno:
    aluno = buscar(db, pessoa_id)
    data = dados.model_dump(exclude_unset=True)
    if "nivel_id" in data and data["nivel_id"] is not None:
        nivel = nivel_repo.buscar_por_id(db, data["nivel_id"])
        if not nivel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nível não encontrado",
            )
    return aluno_repo.atualizar(db, aluno, data)
