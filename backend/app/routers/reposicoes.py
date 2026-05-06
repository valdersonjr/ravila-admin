from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_staff_or_professor
from app.models.user import User
from app.repositories import audit_log as audit_log_repo
from app.repositories import reposicao as reposicao_repo
from app.repositories import aula as aula_repo
from app.schemas.reposicao import ReposicaoPendenteOut

router = APIRouter(prefix="/reposicoes", tags=["reposicoes"])


@router.post("", response_model=ReposicaoPendenteOut, status_code=201)
def gerar_reposicao(
    aluno_id: int,
    aula_origem_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_professor),
):
    aula = aula_repo.buscar_por_id(db, aula_origem_id)
    if not aula:
        raise HTTPException(status_code=404, detail="Aula não encontrada")
    existente = reposicao_repo.buscar_pendente(db, aluno_id, aula_origem_id)
    if existente:
        raise HTTPException(status_code=400, detail="Reposição já gerada para esta falta")
    reposicao = reposicao_repo.criar(db, aluno_id, aula_origem_id)
    audit_log_repo.registrar(db, current_user, request, "CREATE", "reposicao", reposicao.id)
    db.commit()
    db.refresh(reposicao)
    return reposicao


@router.get("", response_model=list[ReposicaoPendenteOut])
def listar_pendentes(
    aluno_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff_or_professor),
):
    if aluno_id:
        return reposicao_repo.listar_pendentes_por_aluno(db, aluno_id)
    return reposicao_repo.listar_pendentes(db)


@router.patch("/{reposicao_id}/usar", response_model=ReposicaoPendenteOut)
def usar_reposicao(
    reposicao_id: int,
    aula_reposicao_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_professor),
):
    r = reposicao_repo.usar(db, reposicao_id, aula_reposicao_id)
    if not r:
        raise HTTPException(status_code=404, detail="Reposição não encontrada")
    audit_log_repo.registrar(db, current_user, request, "UPDATE", "reposicao", reposicao_id)
    db.commit()
    db.refresh(r)
    return r
