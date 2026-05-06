from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_staff_or_professor
from app.models.user import User
from app.repositories import audit_log as audit_log_repo
from app.schemas.presenca import PresencaBatchRequest, PresencaItem, PresencaOut
from app.services import presenca as presenca_service

router = APIRouter(tags=["presencas"])


@router.get("/aulas/{aula_id}/presencas", response_model=list[PresencaOut])
def listar_presencas(
    aula_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff_or_professor),
):
    return presenca_service.listar_por_aula(db, aula_id)


@router.post("/aulas/{aula_id}/presencas", response_model=PresencaOut, status_code=201)
def adicionar_presenca(
    aula_id: int,
    body: PresencaItem,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff_or_professor),
):
    return presenca_service.adicionar(db, aula_id, body)


@router.post("/aulas/{aula_id}/presencas/batch", response_model=list[PresencaOut])
def registrar_batch(
    aula_id: int,
    body: PresencaBatchRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_professor),
):
    result = presenca_service.registrar_batch(db, aula_id, body.presencas)
    audit_log_repo.registrar(db, current_user, request, "UPDATE", "presenca", aula_id, {"aula_id": aula_id, "total": len(body.presencas)})
    db.commit()
    return result
