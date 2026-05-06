from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.repositories import audit_log as audit_log_repo

router = APIRouter(prefix="/audit-log", tags=["audit-log"])


@router.get("/")
def listar(
    entity: Optional[str] = Query(None),
    entity_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return audit_log_repo.listar(db, entity, entity_id, user_id, limit)
