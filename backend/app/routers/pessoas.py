from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.schemas.pessoa import PessoaCreate, PessoaUpdate, PessoaOut
from app.services import pessoa as pessoa_service

router = APIRouter(prefix="/pessoas", tags=["pessoas"])


@router.get("/", response_model=list[PessoaOut])
def listar(
    search: Optional[str] = Query(None, description="Search by nome or cpf"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return pessoa_service.listar(db, search)


@router.post("/", response_model=PessoaOut, status_code=status.HTTP_201_CREATED)
def criar(
    body: PessoaCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return pessoa_service.criar(db, body)


@router.get("/{pessoa_id}", response_model=PessoaOut)
def buscar(
    pessoa_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return pessoa_service.buscar(db, pessoa_id)


@router.put("/{pessoa_id}", response_model=PessoaOut)
def atualizar(
    pessoa_id: int,
    body: PessoaUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return pessoa_service.atualizar(db, pessoa_id, body)
