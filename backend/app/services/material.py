from typing import Optional

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.models.material import Material
from app.models.user import User
from app.repositories import material as repo
from app.schemas.material import MaterialCreate, MaterialUpdate
from app.services import s3 as s3_service

EXTENSOES_PERMITIDAS = {"pdf", "jpg", "jpeg", "png", "gif", "mp4", "mov"}
TAMANHO_MAX_MB = 50


def _to_out_dict(m: Material) -> dict:
    return {
        "id": m.id,
        "titulo": m.titulo,
        "descricao": m.descricao,
        "tipo": m.tipo,
        "categoria": m.categoria,
        "s3_key": m.s3_key,
        "url_externa": m.url_externa,
        "aula_id": m.aula_id,
        "turma_id": m.turma_id,
        "turma_nome": m.turma.nome if m.turma else None,
        "publico": m.publico,
        "criado_por_id": m.criado_por_id,
        "criado_em": m.criado_em,
        "tem_arquivo": bool(m.s3_key),
    }


def listar(
    db: Session,
    *,
    aula_id: Optional[int] = None,
    turma_id: Optional[int] = None,
    categoria: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[dict], int]:
    items, total = repo.listar(
        db,
        aula_id=aula_id,
        turma_id=turma_id,
        categoria=categoria,
        skip=(page - 1) * page_size,
        limit=page_size,
    )
    return [_to_out_dict(m) for m in items], total


def buscar(db: Session, material_id: int) -> dict:
    m = repo.buscar_por_id(db, material_id)
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material não encontrado")
    return _to_out_dict(m)


def criar(db: Session, dados: MaterialCreate, criado_por: User) -> dict:
    m = repo.criar(db, {
        **dados.model_dump(),
        "criado_por_id": criado_por.id,
    })
    return _to_out_dict(m)


def atualizar(db: Session, material_id: int, dados: MaterialUpdate, usuario: User) -> dict:
    m = repo.buscar_por_id(db, material_id)
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material não encontrado")
    _verificar_permissao(m, usuario)
    m = repo.atualizar(db, m, dados.model_dump(exclude_none=True))
    return _to_out_dict(m)


def deletar(db: Session, material_id: int, usuario: User) -> None:
    m = repo.buscar_por_id(db, material_id)
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material não encontrado")
    _verificar_permissao(m, usuario)
    if m.s3_key:
        s3_service.deletar_arquivo(m.s3_key)
    repo.deletar(db, m)


def fazer_upload(db: Session, material_id: int, file: UploadFile, usuario: User) -> dict:
    m = repo.buscar_por_id(db, material_id)
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material não encontrado")
    _verificar_permissao(m, usuario)

    filename = file.filename or "arquivo"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in EXTENSOES_PERMITIDAS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Extensão não permitida. Use: {', '.join(sorted(EXTENSOES_PERMITIDAS))}",
        )

    file_bytes = file.file.read()
    if len(file_bytes) > TAMANHO_MAX_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Arquivo muito grande. Limite: {TAMANHO_MAX_MB}MB",
        )

    # Remove arquivo anterior se existir
    if m.s3_key:
        s3_service.deletar_arquivo(m.s3_key)

    key = s3_service.upload_material(file_bytes, material_id, filename)
    m = repo.atualizar(db, m, {"s3_key": key})
    return _to_out_dict(m)


def gerar_url_download(db: Session, material_id: int) -> str:
    m = repo.buscar_por_id(db, material_id)
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material não encontrado")
    if not m.s3_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo não disponível")
    return s3_service.gerar_url_temporaria(m.s3_key, expires_in=300)


def _verificar_permissao(m: Material, usuario: User) -> None:
    """Professor só pode editar/deletar materiais que ele criou."""
    if usuario.role == "professor" and m.criado_por_id != usuario.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você só pode editar materiais que criou",
        )
