from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import verify_password, create_access_token, create_refresh_token
from app.repositories import user as user_repo
from app.repositories import professor as professor_repo


def _derive_role(user, db: Session) -> str:
    if user.is_admin:
        return "admin"
    if user.is_secretario:
        return "secretario"
    if user.pessoa_id and professor_repo.buscar_por_pessoa_id(db, user.pessoa_id):
        return "professor"
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Usuário não possui perfil associado no sistema",
    )


def login(db: Session, username: str, senha: str) -> dict:
    user = user_repo.buscar_por_username(db, username)
    if not user or not user.ativo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos",
        )
    if not verify_password(senha, user.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos",
        )
    role = _derive_role(user, db)
    token_data = {
        "sub": user.username,
        "role": role,
        "pessoa_id": user.pessoa_id,
    }
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token({"sub": user.username})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": role,
        "pessoa_id": user.pessoa_id,
        "nome": user.pessoa.nome if user.pessoa else user.username,
    }
