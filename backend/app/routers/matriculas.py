from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_staff_or_professor
from app.models.user import User
from app.schemas.matricula import MatriculaCreate, MatriculaStatusUpdate, MatriculaOut
from app.services import matricula as matricula_service

router = APIRouter(prefix="/matriculas", tags=["matriculas"])


@router.get("/", response_model=list[MatriculaOut])
def listar(
    aluno_id: Optional[int] = Query(None),
    turma_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    _: User = Depends(require_staff_or_professor),
):
    return matricula_service.listar(db, aluno_id, turma_id, status_filter)


@router.post("/", response_model=MatriculaOut, status_code=status.HTTP_201_CREATED)
def criar(
    body: MatriculaCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff_or_professor),
):
    return matricula_service.criar(db, body)


@router.patch("/{matricula_id}/status", response_model=MatriculaOut)
def atualizar_status(
    matricula_id: int,
    body: MatriculaStatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff_or_professor),
):
    return matricula_service.atualizar_status(db, matricula_id, body)
