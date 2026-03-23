import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, decode_refresh_token
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import LoginRequest, RefreshRequest, RefreshResponse, TokenResponse
from app.services import auth as auth_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    result = auth_service.login(db, body.cpf, body.senha)
    logger.info("login cpf=%s role=%s", body.cpf[-4:], result["role"])
    return result


@router.post("/refresh", response_model=RefreshResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_refresh_token(body.refresh_token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado")
    cpf: str | None = payload.get("sub")
    if not cpf:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    user = db.query(User).filter(User.pessoa.has(cpf=cpf)).first()
    if user is None or not user.ativo:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário inativo ou não encontrado")
    access_token = create_access_token({"sub": cpf, "role": user.role, "pessoa_id": user.pessoa_id})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "role": current_user.role,
        "pessoa_id": current_user.pessoa_id,
        "nome": current_user.pessoa.nome if current_user.pessoa else None,
        "ativo": current_user.ativo,
    }
