import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, decode_refresh_token
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.repositories import user as user_repo
from app.schemas.auth import LoginRequest, RefreshRequest, RefreshResponse, TokenResponse
from app.services import auth as auth_service
from app.services.auth import _derive_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    result = auth_service.login(db, body.username, body.senha)
    logger.info("login username=%s role=%s", body.username, result["role"])
    return result


@router.post("/refresh", response_model=RefreshResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_refresh_token(body.refresh_token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado")
    username: str | None = payload.get("sub")
    if not username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    user = user_repo.buscar_por_username(db, username)
    if user is None or not user.ativo:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário inativo ou não encontrado")
    role = _derive_role(user, db)
    access_token = create_access_token({"sub": username, "role": role, "pessoa_id": user.pessoa_id})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "role": current_user.role,
        "pessoa_id": current_user.pessoa_id,
        "nome": current_user.pessoa.nome if current_user.pessoa else current_user.username,
        "ativo": current_user.ativo,
    }
