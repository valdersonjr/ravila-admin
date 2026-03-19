from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_admin, require_admin_or_professor
from app.models.user import User
from app.schemas.aula import AulaCreate, AulaStatusUpdate, AulaRemarcarRequest, AulaSubstituirProfessorRequest, AulaDescricaoUpdate, AulaOut
from app.services import aula as aula_service

router = APIRouter(prefix="/aulas", tags=["aulas"])


@router.get("/", response_model=list[AulaOut])
def listar(
    turma_id: Optional[int] = Query(None),
    professor_id: Optional[int] = Query(None),
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    effective_professor_id = None
    if current_user.role == "professor":
        effective_professor_id = current_user.pessoa_id
    elif professor_id:
        effective_professor_id = professor_id
    return aula_service.listar(db, turma_id, effective_professor_id, data_inicio, data_fim, status_filter)


@router.get("/{aula_id}", response_model=AulaOut)
def buscar(
    aula_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    aula = aula_service.buscar(db, aula_id)
    if current_user.role == "professor" and aula.professor_id != current_user.pessoa_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    return aula


@router.post("/", response_model=AulaOut, status_code=status.HTTP_201_CREATED)
def criar(
    body: AulaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_professor),
):
    pendente = current_user.role == "professor"
    return aula_service.criar(db, body, pendente_aprovacao=pendente)


@router.patch("/{aula_id}/status", response_model=AulaOut)
def atualizar_status(
    aula_id: int,
    body: AulaStatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_or_professor),
):
    return aula_service.atualizar_status(db, aula_id, body.status)


@router.patch("/{aula_id}/aprovar", response_model=AulaOut)
def aprovar(
    aula_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return aula_service.aprovar(db, aula_id)


@router.patch("/{aula_id}/professor", response_model=AulaOut)
def substituir_professor(
    aula_id: int,
    body: AulaSubstituirProfessorRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_or_professor),
):
    return aula_service.substituir_professor(db, aula_id, body.professor_id)


@router.patch("/{aula_id}/descricao", response_model=AulaOut)
def atualizar_descricao(
    aula_id: int,
    body: AulaDescricaoUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_or_professor),
):
    return aula_service.atualizar_descricao(db, aula_id, body.descricao)


@router.post("/{aula_id}/remarcar", response_model=AulaOut, status_code=status.HTTP_201_CREATED)
def remarcar(
    aula_id: int,
    body: AulaRemarcarRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_or_professor),
):
    return aula_service.remarcar(db, aula_id, body.data, body.hora_inicio, body.hora_fim)
