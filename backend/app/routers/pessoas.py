from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_staff, require_staff_or_professor
from app.models.user import User
from app.repositories import audit_log as audit_log_repo
from app.schemas.pessoa import PessoaCreate, PessoaUpdate, PessoaOut, PessoaListOut
from app.services import pessoa as pessoa_service

router = APIRouter(prefix="/pessoas", tags=["pessoas"])


@router.get("/", response_model=PessoaListOut)
def listar(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(require_staff_or_professor),
):
    return pessoa_service.listar(db, search, page, page_size)


@router.post("/", response_model=PessoaOut, status_code=status.HTTP_201_CREATED)
def criar(
    body: PessoaCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    pessoa = pessoa_service.criar(db, body)
    audit_log_repo.registrar(db, current_user, request, "CREATE", "pessoa", pessoa.id)
    db.commit()
    db.refresh(pessoa)
    return pessoa


@router.get("/{pessoa_id}", response_model=PessoaOut)
def buscar(
    pessoa_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    return pessoa_service.buscar(db, pessoa_id)


@router.put("/{pessoa_id}", response_model=PessoaOut)
def atualizar(
    pessoa_id: int,
    body: PessoaUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    pessoa = pessoa_service.atualizar(db, pessoa_id, body)
    audit_log_repo.registrar(db, current_user, request, "UPDATE", "pessoa", pessoa_id)
    db.commit()
    db.refresh(pessoa)
    return pessoa
