from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_staff_or_professor
from app.models.user import User
from app.repositories import audit_log as audit_log_repo
from app.schemas.questao import QuestaoCreate, QuestaoOut, QuestaoUpdate
from app.services import questao as svc


class QuestaoListOut(BaseModel):
    items: list[QuestaoOut]
    total: int
    page: int
    page_size: int

router = APIRouter(prefix="/questoes", tags=["questoes"])


@router.get("/", response_model=QuestaoListOut)
def listar(
    nivel: Optional[str] = Query(None),
    subtipo: Optional[str] = Query(None),
    contexto: Optional[str] = Query(None),
    topico: Optional[str] = Query(None),
    dificuldade: Optional[str] = Query(None),
    ativo: Optional[bool] = Query(True),
    busca: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_staff_or_professor),
):
    items, total = svc.listar(
        db,
        nivel=nivel,
        subtipo=subtipo,
        contexto=contexto,
        topico=topico,
        dificuldade=dificuldade,
        ativo=ativo,
        busca=busca,
        skip=(page - 1) * page_size,
        limit=page_size,
    )
    return QuestaoListOut(items=items, total=total, page=page, page_size=page_size)


@router.post("/", response_model=QuestaoOut, status_code=status.HTTP_201_CREATED)
def criar(
    dados: QuestaoCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_professor),
):
    questao = svc.criar(db, dados, criado_por_id=current_user.id)
    audit_log_repo.registrar(db, current_user, request, "CREATE", "questao", questao.id)
    db.commit()
    db.refresh(questao)
    return questao


@router.get("/{questao_id}", response_model=QuestaoOut)
def buscar(
    questao_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff_or_professor),
):
    from app.repositories.questao import buscar as repo_buscar
    from fastapi import HTTPException
    q = repo_buscar(db, questao_id)
    if not q:
        raise HTTPException(status_code=404, detail="Questão não encontrada")
    return q


@router.patch("/{questao_id}", response_model=QuestaoOut)
def atualizar(
    questao_id: int,
    dados: QuestaoUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_professor),
):
    questao = svc.atualizar(db, questao_id, dados)
    audit_log_repo.registrar(db, current_user, request, "UPDATE", "questao", questao_id)
    db.commit()
    db.refresh(questao)
    return questao


@router.delete("/{questao_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar(
    questao_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_professor),
):
    audit_log_repo.registrar(db, current_user, request, "DELETE", "questao", questao_id)
    svc.deletar(db, questao_id)
