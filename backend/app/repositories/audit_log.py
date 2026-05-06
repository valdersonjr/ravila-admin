import json
from typing import Any

from fastapi import Request
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.user import User


def _get_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else None


def registrar(
    db: Session,
    user: User,
    request: Request,
    action: str,
    entity: str,
    entity_id: int,
    detalhes: dict[str, Any] | None = None,
) -> None:
    log = AuditLog(
        user_id=user.id,
        user_username=user.username,
        action=action,
        entity=entity,
        entity_id=entity_id,
        detalhes=json.dumps(detalhes, default=str) if detalhes else None,
        ip_address=_get_ip(request),
        user_agent=request.headers.get("User-Agent"),
    )
    db.add(log)


def listar(
    db: Session,
    entity: str | None = None,
    entity_id: int | None = None,
    user_id: int | None = None,
    limit: int = 100,
) -> list[AuditLog]:
    q = db.query(AuditLog)
    if entity:
        q = q.filter(AuditLog.entity == entity)
    if entity_id is not None:
        q = q.filter(AuditLog.entity_id == entity_id)
    if user_id is not None:
        q = q.filter(AuditLog.user_id == user_id)
    return q.order_by(AuditLog.created_at.desc()).limit(limit).all()
