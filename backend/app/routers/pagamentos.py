import logging
from typing import Optional

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.schemas.pagamento import (
    CalculoProfessorOut,
    PagamentoProfessorCreate,
    PagamentoProfessorOut,
    PagamentoProfessorUpdate,
)
from app.services import pagamento as pagamento_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pagamentos", tags=["pagamentos"])


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
    logger.info("pagamento.professor.criar professor_id=%s referencia=%s", body.professor_id, body.referencia)
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
