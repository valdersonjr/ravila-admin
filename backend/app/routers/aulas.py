from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_staff, require_staff_or_professor
from app.models.user import User
from app.repositories import audit_log as audit_log_repo
from app.schemas.aula import (
    AulaAvulsaCreate,
    AulaConteudoUpdate,
    AulaCreate,
    AulaDescricaoUpdate,
    AulaListOut,
    AulaOut,
    AulaRemarcarRequest,
    AulaStatusUpdate,
    AulaSubstituirProfessorRequest,
)
from app.services import aula as aula_service

router = APIRouter(prefix="/aulas", tags=["aulas"])


def _enrich_aula(out: AulaOut, db: Session) -> AulaOut:
    from app.models.avaliacao import Avaliacao
    av = db.query(Avaliacao).filter(
        Avaliacao.aula_id == out.id,
        Avaliacao.deletado == False,
    ).first()
    out.avaliacao_id = av.id if av else None
    out.avaliacao_titulo = av.titulo if av else None
    return out


def _enrich_aulas_batch(items: list[AulaOut], db: Session) -> None:
    from app.models.avaliacao import Avaliacao
    if not items:
        return
    aula_ids = [a.id for a in items]
    avaliacoes = {
        av.aula_id: av
        for av in db.query(Avaliacao)
        .filter(Avaliacao.aula_id.in_(aula_ids), Avaliacao.deletado == False)
        .all()
    }
    for item in items:
        av = avaliacoes.get(item.id)
        item.avaliacao_id = av.id if av else None
        item.avaliacao_titulo = av.titulo if av else None


@router.get("/", response_model=AulaListOut)
def listar(
    turma_id: Optional[int] = Query(None),
    professor_id: Optional[int] = Query(None),
    aluno_id: Optional[int] = Query(None),
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    effective_professor_id = None
    if current_user.role == "professor":
        effective_professor_id = current_user.pessoa_id
    elif professor_id:
        effective_professor_id = professor_id
    result = aula_service.listar(
        db, turma_id, effective_professor_id, data_inicio, data_fim, status_filter, aluno_id, page, page_size
    )
    _enrich_aulas_batch(result.items, db)
    return result


@router.get("/{aula_id}", response_model=AulaOut)
def buscar(
    aula_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    aula = aula_service.buscar(db, aula_id)
    if current_user.role == "professor" and aula.professor_id != current_user.pessoa_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    return _enrich_aula(AulaOut.model_validate(aula), db)


@router.post("/", response_model=AulaOut, status_code=status.HTTP_201_CREATED)
def criar(
    body: AulaCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_professor),
):
    professor_pessoa_id = current_user.pessoa_id if current_user.role == "professor" else None
    aula = aula_service.criar(db, body, professor_pessoa_id=professor_pessoa_id)
    audit_log_repo.registrar(db, current_user, request, "CREATE", "aula", aula.id)
    db.commit()
    db.refresh(aula)
    return aula


@router.post("/avulsa", response_model=AulaOut, status_code=status.HTTP_201_CREATED)
def criar_avulsa(
    body: AulaAvulsaCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff_or_professor),
):
    return aula_service.criar_avulsa(db, body)


@router.delete("/{aula_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar(
    aula_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_professor),
):
    aula = aula_service.buscar(db, aula_id)
    if current_user.role == "professor" and aula.professor_id != current_user.pessoa_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    audit_log_repo.registrar(db, current_user, request, "DELETE", "aula", aula_id)
    aula_service.deletar(db, aula_id)


@router.patch("/{aula_id}/status", response_model=AulaOut)
def atualizar_status(
    aula_id: int,
    body: AulaStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_professor),
):
    aula = aula_service.atualizar_status(db, aula_id, body.status)
    audit_log_repo.registrar(db, current_user, request, "UPDATE", "aula", aula_id, {"status": body.status})
    db.commit()
    db.refresh(aula)
    return aula


@router.patch("/{aula_id}/aprovar", response_model=AulaOut)
def aprovar(
    aula_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    return aula_service.aprovar(db, aula_id)


@router.patch("/{aula_id}/professor", response_model=AulaOut)
def substituir_professor(
    aula_id: int,
    body: AulaSubstituirProfessorRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff_or_professor),
):
    return aula_service.substituir_professor(db, aula_id, body.professor_id)


@router.patch("/{aula_id}/descricao", response_model=AulaOut)
def atualizar_descricao(
    aula_id: int,
    body: AulaDescricaoUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff_or_professor),
):
    return aula_service.atualizar_descricao(db, aula_id, body.descricao)


@router.patch("/{aula_id}/conteudo", response_model=AulaOut)
def atualizar_conteudo(
    aula_id: int,
    body: AulaConteudoUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff_or_professor),
):
    return aula_service.atualizar_conteudo(db, aula_id, body.conteudo_dado)


@router.post("/{aula_id}/remarcar", response_model=AulaOut, status_code=status.HTTP_201_CREATED)
def remarcar(
    aula_id: int,
    body: AulaRemarcarRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff_or_professor),
):
    return aula_service.remarcar(db, aula_id, body.data, body.hora_inicio, body.hora_fim)
