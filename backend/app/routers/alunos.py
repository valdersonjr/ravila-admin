from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.schemas.aluno import AlunoCreate, AlunoUpdate, AlunoOut, AlunoListOut
from app.services import aluno as aluno_service

router = APIRouter(prefix="/alunos", tags=["alunos"])


@router.get("/", response_model=AlunoListOut)
def listar(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    nivel_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return aluno_service.listar(db, status_filter, search, nivel_id, page, page_size)


@router.post("/", response_model=AlunoOut, status_code=status.HTTP_201_CREATED)
def criar(
    body: AlunoCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return aluno_service.criar(db, body)


@router.get("/aniversarios", response_model=list[AlunoOut])
def aniversarios(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return aluno_service.aniversarios_semanas(db)


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
