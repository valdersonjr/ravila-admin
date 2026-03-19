from typing import Optional

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.schemas.pagamento import (
    PagamentoAlunoCreate,
    PagamentoAlunoOut,
    PagamentoAlunoUpdate,
    PagamentoProfessorCreate,
    PagamentoProfessorOut,
    PagamentoProfessorUpdate,
    CalculoProfessorOut,
)
from app.services import pagamento as pagamento_service

router = APIRouter(prefix="/pagamentos", tags=["pagamentos"])


# ─── Pagamentos Alunos ────────────────────────────────────────────────────────

@router.get("/alunos/", response_model=list[PagamentoAlunoOut])
def listar_alunos(
    aluno_id: Optional[int] = Query(None),
    referencia: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return pagamento_service.listar_alunos(db, aluno_id, referencia, status_filter)


@router.post("/alunos/", response_model=PagamentoAlunoOut, status_code=status.HTTP_201_CREATED)
def criar_aluno(
    body: PagamentoAlunoCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return pagamento_service.criar_aluno(db, body)


@router.patch("/alunos/{pagamento_id}", response_model=PagamentoAlunoOut)
def atualizar_aluno(
    pagamento_id: int,
    body: PagamentoAlunoUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return pagamento_service.atualizar_aluno(db, pagamento_id, body)


@router.post("/alunos/{pagamento_id}/comprovante", response_model=PagamentoAlunoOut)
def upload_comprovante_aluno(
    pagamento_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return pagamento_service.upload_comprovante_aluno(
        db, pagamento_id, file, file.filename or ""
    )


# ─── Pagamentos Professores ──────────────────────────────────────────────────

@router.get("/professores/calcular", response_model=CalculoProfessorOut)
def calcular_professor(
    professor_id: int = Query(...),
    referencia: str = Query(..., description="MM/YYYY"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return pagamento_service.calcular_professor(db, professor_id, referencia)


@router.get("/professores/", response_model=list[PagamentoProfessorOut])
def listar_professores(
    professor_id: Optional[int] = Query(None),
    referencia: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return pagamento_service.listar_professores(db, professor_id, referencia)


@router.post("/professores/", response_model=PagamentoProfessorOut, status_code=status.HTTP_201_CREATED)
def criar_professor(
    body: PagamentoProfessorCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return pagamento_service.criar_professor(db, body)


@router.patch("/professores/{pagamento_id}", response_model=PagamentoProfessorOut)
def atualizar_professor(
    pagamento_id: int,
    body: PagamentoProfessorUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return pagamento_service.atualizar_professor(db, pagamento_id, body)


@router.post("/professores/{pagamento_id}/comprovante", response_model=PagamentoProfessorOut)
def upload_comprovante_professor(
    pagamento_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return pagamento_service.upload_comprovante_professor(
        db, pagamento_id, file, file.filename or ""
    )
