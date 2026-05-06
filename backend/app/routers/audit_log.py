from datetime import datetime
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
    action: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    items, total = audit_log_repo.listar(
        db, entity, entity_id, user_id, action, search, date_from, date_to, limit, offset
    )
    return {"items": items, "total": total}
