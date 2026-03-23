from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.schemas.livro import LivroCreate, LivroUpdate, LivroOut
from app.services import livro as livro_service

router = APIRouter(prefix="/livros", tags=["livros"])


@router.get("/", response_model=list[LivroOut])
def listar(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return livro_service.listar(db, include_inactive)


@router.post("/", response_model=LivroOut, status_code=status.HTTP_201_CREATED)
def criar(
    body: LivroCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return livro_service.criar(db, body)


@router.patch("/{livro_id}", response_model=LivroOut)
def atualizar(
    livro_id: int,
    body: LivroUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return livro_service.atualizar(db, livro_id, body)
