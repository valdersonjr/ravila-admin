from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import verify_password, create_access_token
from app.repositories import user as user_repo
from app.services.pessoa import _clean_cpf


def login(db: Session, cpf: str, senha: str) -> dict:
    cpf_limpo = _clean_cpf(cpf)
    user = user_repo.buscar_por_cpf(db, cpf_limpo)
    if not user or not user.ativo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="CPF ou senha incorretos",
        )
    if not verify_password(senha, user.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="CPF ou senha incorretos",
        )
    token_data = {
        "sub": user.pessoa.cpf,
        "role": user.role,
        "pessoa_id": user.pessoa_id,
    }
    access_token = create_access_token(token_data)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "pessoa_id": user.pessoa_id,
        "nome": user.pessoa.nome,
    }
