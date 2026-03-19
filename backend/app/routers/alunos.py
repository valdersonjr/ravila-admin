from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.schemas.aluno import AlunoCreate, AlunoUpdate, AlunoOut
from app.services import aluno as aluno_service

router = APIRouter(prefix="/alunos", tags=["alunos"])


@router.get("/", response_model=list[AlunoOut])
def listar(
    status_filter: Optional[str] = Query(None, alias="status"),
    inadimplente: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return aluno_service.listar(db, status_filter, inadimplente)


@router.post("/", response_model=AlunoOut, status_code=status.HTTP_201_CREATED)
def criar(
    body: AlunoCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return aluno_service.criar(db, body)


@router.get("/{pessoa_id}", response_model=AlunoOut)
def buscar(
    pessoa_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return aluno_service.buscar(db, pessoa_id)


@router.put("/{pessoa_id}", response_model=AlunoOut)
def atualizar(
    pessoa_id: int,
    body: AlunoUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return aluno_service.atualizar(db, pessoa_id, body)
