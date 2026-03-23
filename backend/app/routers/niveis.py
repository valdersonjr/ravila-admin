from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.schemas.nivel import NivelOut
from app.services import nivel as nivel_service

router = APIRouter(prefix="/niveis", tags=["niveis"])


@router.get("/", response_model=list[NivelOut])
def listar(
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return nivel_service.listar(db, include_inactive)
