from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin, get_current_user
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserOut
from app.services import user as user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/", response_model=list[UserOut])
def listar(
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return user_service.listar(db, role)


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def criar(
    body: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return user_service.criar(db, body)


@router.get("/{pessoa_id}", response_model=UserOut)
def buscar(
    pessoa_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return user_service.buscar(db, pessoa_id)


@router.put("/{pessoa_id}", response_model=UserOut)
def atualizar(
    pessoa_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return user_service.atualizar(db, pessoa_id, body)
