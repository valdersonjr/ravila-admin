import logging

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.limiter import limiter
from app.core.security import create_access_token, decode_refresh_token, hash_password, verify_password
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.repositories import pessoa as pessoa_repo
from app.repositories import user as user_repo
from app.schemas.auth import LoginRequest, MeUpdate, RefreshRequest, RefreshResponse, TokenResponse
from app.services import s3 as s3_service
from app.services import auth as auth_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

_MAX_FOTO_BYTES = 200 * 1024 * 1024  # 200 MB
_ALLOWED_IMAGE_MAGIC = (b"\xff\xd8\xff", b"\x89PNG", b"GIF87a", b"GIF89a")


def _validar_imagem(data: bytes) -> None:
    is_webp = data[:4] == b"RIFF" and data[8:12] == b"WEBP"
    if not any(data.startswith(m) for m in _ALLOWED_IMAGE_MAGIC) and not is_webp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Formato de imagem inválido")


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    result = auth_service.login(db, body.username, body.senha)
    logger.info("login username=%s role=%s", body.username, result["role"])
    return result


@router.post("/refresh", response_model=RefreshResponse)
@limiter.limit("30/minute")
def refresh(request: Request, body: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_refresh_token(body.refresh_token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado")
    username: str | None = payload.get("sub")
    if not username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    user = user_repo.buscar_por_username(db, username)
    if user is None or not user.ativo:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário inativo ou não encontrado")
    access_token = create_access_token({"sub": username, "role": user.role, "pessoa_id": user.pessoa_id})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "role": current_user.role,
        "pessoa_id": current_user.pessoa_id,
        "nome": current_user.pessoa.nome if current_user.pessoa else current_user.username,
        "email": current_user.pessoa.email if current_user.pessoa else None,
        "telefone": current_user.pessoa.telefone if current_user.pessoa else None,
        "tem_foto": bool(current_user.foto_key or (current_user.pessoa and current_user.pessoa.foto_key)),
        "ativo": current_user.ativo,
    }


@router.post("/me/foto")
def upload_foto(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    file_bytes = file.file.read(_MAX_FOTO_BYTES + 1)
    if len(file_bytes) > _MAX_FOTO_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Arquivo muito grande (máximo 10 MB)")
    _validar_imagem(file_bytes)
    key = s3_service.upload_foto(file_bytes, current_user.id, file.filename or "foto.jpg")
    current_user.foto_key = key
    db.add(current_user)
    db.commit()
    return {"tem_foto": True}


@router.get("/me/foto")
def ver_foto(
    current_user: User = Depends(get_current_user),
):
    key = current_user.foto_key or (current_user.pessoa.foto_key if current_user.pessoa else None)
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foto não encontrada")
    url = s3_service.gerar_url_temporaria(key, expires_in=300)
    return {"url": url}


@router.patch("/me")
def atualizar_me(
    body: MeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = body.model_dump(exclude_unset=True)

    if "senha" in data:
        senha_antiga = data.pop("senha_antiga", None)
        if not senha_antiga or not verify_password(senha_antiga, current_user.senha_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Senha atual incorreta")
        current_user.senha_hash = hash_password(data.pop("senha"))
        db.add(current_user)

    data.pop("senha_antiga", None)

    if data and current_user.pessoa_id:
        pessoa = pessoa_repo.buscar_por_id(db, current_user.pessoa_id)
        if pessoa:
            pessoa_repo.atualizar(db, pessoa, data)

    db.commit()
    return {
        "nome": current_user.pessoa.nome if current_user.pessoa else current_user.username,
        "email": current_user.pessoa.email if current_user.pessoa else None,
        "telefone": current_user.pessoa.telefone if current_user.pessoa else None,
    }
