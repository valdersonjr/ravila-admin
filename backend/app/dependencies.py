from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.database import get_db
from app.models.user import User
from app.repositories import user as user_repo

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    username: str | None = payload.get("sub")
    if username is None:
        raise credentials_exception
    user = user_repo.buscar_por_username(db, username)
    if user is None or not user.ativo:
        raise credentials_exception
    # Role é derivada no login e carregada do JWT — não lida do banco
    user.role = payload.get("role", "")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user


def require_staff(current_user: User = Depends(get_current_user)) -> User:
    """Admin ou secretário — tudo exceto gestão de usuários."""
    if current_user.role not in ("admin", "secretario"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff privileges required",
        )
    return current_user


def require_staff_or_professor(current_user: User = Depends(get_current_user)) -> User:
    """Admin, secretário ou professor."""
    if current_user.role not in ("admin", "secretario", "professor"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff or professor privileges required",
        )
    return current_user


def require_admin_or_professor(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("admin", "professor"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or professor privileges required",
        )
    return current_user


def require_aluno(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "aluno":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito ao portal do aluno",
        )
    if not current_user.pessoa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário aluno não possui pessoa vinculada",
        )
    return current_user
