from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_staff, get_current_user
from app.models.user import User
from app.schemas.turma import (
    TurmaCreate,
    TurmaUpdate,
    TurmaOut,
    HorarioTurmaCreate,
    HorarioTurmaOut,
    GerarAulasRequest,
    GerarAulasResponse,
    GerarSemanaRequest,
    GerarSemanaRelatorio,
)
from app.services import turma as turma_service

router = APIRouter(prefix="/turmas", tags=["turmas"])


@router.get("/", response_model=list[TurmaOut])
def listar(
    professor_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    effective_professor_id = None
    if current_user.role == "professor":
        effective_professor_id = current_user.pessoa_id
    elif professor_id:
        effective_professor_id = professor_id
    return turma_service.listar(db, effective_professor_id, status_filter)


@router.post("/", response_model=TurmaOut, status_code=status.HTTP_201_CREATED)
def criar(
    body: TurmaCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    return turma_service.criar(db, body)


@router.get("/{turma_id}", response_model=TurmaOut)
def buscar(
    turma_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    turma = turma_service.buscar(db, turma_id)
    if current_user.role == "professor" and turma.professor_id != current_user.pessoa_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    return turma


@router.put("/{turma_id}", response_model=TurmaOut)
def atualizar(
    turma_id: int,
    body: TurmaUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    return turma_service.atualizar(db, turma_id, body)


@router.post("/{turma_id}/horarios", response_model=HorarioTurmaOut, status_code=status.HTTP_201_CREATED)
def adicionar_horario(
    turma_id: int,
    body: HorarioTurmaCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    return turma_service.adicionar_horario(db, turma_id, body)


@router.delete("/{turma_id}/horarios/{horario_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_horario(
    turma_id: int,
    horario_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    turma_service.remover_horario(db, turma_id, horario_id)


@router.post("/{turma_id}/gerar-aulas", response_model=GerarAulasResponse)
def gerar_aulas(
    turma_id: int,
    body: GerarAulasRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    try:
        data_inicio = date.fromisoformat(body.data_inicio)
        data_fim = date.fromisoformat(body.data_fim)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Datas inválidas. Use o formato YYYY-MM-DD",
        )
    aulas_criadas = turma_service.gerar_aulas(db, turma_id, data_inicio, data_fim)
    return GerarAulasResponse(aulas_criadas=aulas_criadas)


@router.post("/gerar-semana", response_model=GerarSemanaRelatorio)
def gerar_semana(
    body: GerarSemanaRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    return turma_service.gerar_semana(db, dry_run=body.dry_run)
