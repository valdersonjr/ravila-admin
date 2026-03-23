from typing import Any, Optional

from fastapi import APIRouter, Depends, Query, HTTPException, Request, status
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


@router.get("/{user_id}", response_model=UserOut)
def buscar(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return user_service.buscar(db, user_id)


@router.patch("/{user_id}", response_model=UserOut)
async def atualizar(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    raw: dict[str, Any] = await request.json()
    body = UserUpdate.model_validate(raw)
    pessoa_id_in_body = "pessoa_id" in raw
    pessoa_id_value = raw.get("pessoa_id")  # None if desvincular, int if vincular
    return user_service.atualizar(db, user_id, body, pessoa_id_in_body, pessoa_id_value)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Não é possível excluir o próprio usuário.")
    user_service.deletar(db, user_id)
