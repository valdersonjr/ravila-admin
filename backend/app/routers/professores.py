from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin, get_current_user
from app.models.user import User
from app.schemas.professor import ProfessorCreate, ProfessorUpdate, ProfessorOut, ProfessorDashboardOut
from app.services import professor as professor_service

router = APIRouter(prefix="/professores", tags=["professores"])


@router.get("/", response_model=list[ProfessorOut])
def listar(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return professor_service.listar(db)


@router.post("/", response_model=ProfessorOut, status_code=status.HTTP_201_CREATED)
def criar(
    body: ProfessorCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return professor_service.criar(db, body)


@router.get("/{pessoa_id}", response_model=ProfessorOut)
def buscar(
    pessoa_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "professor" and current_user.pessoa_id != pessoa_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    return professor_service.buscar(db, pessoa_id)


@router.put("/{pessoa_id}", response_model=ProfessorOut)
def atualizar(
    pessoa_id: int,
    body: ProfessorUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return professor_service.atualizar(db, pessoa_id, body)


@router.get("/{pessoa_id}/dashboard", response_model=ProfessorDashboardOut)
def dashboard(
    pessoa_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return professor_service.dashboard(db, pessoa_id)
