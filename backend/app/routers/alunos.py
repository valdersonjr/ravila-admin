from typing import Optional

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_staff, get_current_user
from app.models.matricula import Matricula
from app.models.turma import Turma
from app.models.user import User
from app.schemas.aluno import AlunoCreate, AlunoUpdate, AlunoOut, AlunoListOut
from app.schemas.presenca import PresencaDoAlunoOut
from app.services import aluno as aluno_service
from app.repositories import presenca as presenca_repo

router = APIRouter(prefix="/alunos", tags=["alunos"])


@router.get("/", response_model=AlunoListOut)
def listar(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    nivel_id: Optional[int] = Query(None),
    sem_contrato_ativo: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    return aluno_service.listar(db, status_filter, search, nivel_id, sem_contrato_ativo, page, page_size)


@router.post("/", response_model=AlunoOut, status_code=status.HTTP_201_CREATED)
def criar(
    body: AlunoCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    return aluno_service.criar(db, body)


@router.get("/aniversarios", response_model=list[AlunoOut])
def aniversarios(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    professor_id = current_user.pessoa_id if current_user.role == "professor" else None
    return aluno_service.aniversarios_semanas(db, professor_id)


@router.get("/{pessoa_id}", response_model=AlunoOut)
def buscar(
    pessoa_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "professor":
        tem_acesso = (
            db.query(Matricula)
            .join(Turma, Turma.id == Matricula.turma_id)
            .filter(Matricula.aluno_id == pessoa_id, Turma.professor_id == current_user.pessoa_id)
            .first()
        )
        if not tem_acesso:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    return aluno_service.buscar(db, pessoa_id)


@router.get("/{pessoa_id}/presencas", response_model=dict)
def presencas_do_aluno(
    pessoa_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    items, total = presenca_repo.listar_por_aluno(db, pessoa_id, page, page_size)
    return {
        "items": [PresencaDoAlunoOut.model_validate(p) for p in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.put("/{pessoa_id}", response_model=AlunoOut)
def atualizar(
    pessoa_id: int,
    body: AlunoUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    return aluno_service.atualizar(db, pessoa_id, body)
