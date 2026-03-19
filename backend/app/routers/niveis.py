from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.schemas.nivel import NivelCreate, NivelUpdate, NivelOut
from app.services import nivel as nivel_service

router = APIRouter(prefix="/niveis", tags=["niveis"])


@router.get("/", response_model=list[NivelOut])
def listar(
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return nivel_service.listar(db, include_inactive)


@router.post("/", response_model=NivelOut, status_code=status.HTTP_201_CREATED)
def criar(
    body: NivelCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return nivel_service.criar(db, body)


@router.put("/{nivel_id}", response_model=NivelOut)
def atualizar(
    nivel_id: int,
    body: NivelUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return nivel_service.atualizar(db, nivel_id, body)


@router.delete("/{nivel_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar(
    nivel_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    nivel_service.deletar(db, nivel_id)
