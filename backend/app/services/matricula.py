from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.matricula import Matricula
from app.repositories import matricula as matricula_repo
from app.repositories import aluno as aluno_repo
from app.repositories import turma as turma_repo
from app.schemas.matricula import MatriculaCreate, MatriculaStatusUpdate


def listar(
    db: Session,
    aluno_id: int | None = None,
    turma_id: int | None = None,
    status_filter: str | None = None,
) -> list[Matricula]:
    return matricula_repo.listar(db, aluno_id, turma_id, status_filter)


def criar(db: Session, dados: MatriculaCreate) -> Matricula:
    aluno = aluno_repo.buscar_por_pessoa_id(db, dados.aluno_id)
    if not aluno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aluno não encontrado",
        )
    turma = turma_repo.buscar_por_id(db, dados.turma_id)
    if not turma:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turma não encontrada",
        )
    if matricula_repo.buscar_ativa_por_aluno(db, dados.aluno_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aluno já possui uma matrícula ativa",
        )
    return matricula_repo.criar(db, dados.model_dump())


def atualizar_status(db: Session, matricula_id: int, dados: MatriculaStatusUpdate) -> Matricula:
    matricula = matricula_repo.buscar_por_id(db, matricula_id)
    if not matricula:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Matrícula não encontrada",
        )
    update_data: dict = {"status": dados.status}
    if dados.data_fim is not None:
        update_data["data_fim"] = dados.data_fim
    return matricula_repo.atualizar(db, matricula, update_data)
