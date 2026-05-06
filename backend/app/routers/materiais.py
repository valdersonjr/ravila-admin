from typing import Optional

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_staff_or_professor
from app.models.user import User
from app.repositories import audit_log as audit_log_repo
from app.schemas.material import MaterialCreate, MaterialOut, MaterialUpdate
from app.services import material as svc

router = APIRouter(prefix="/materiais", tags=["materiais"])


@router.get("/", response_model=list[MaterialOut])
def listar(
    aula_id: Optional[int] = Query(None),
    turma_id: Optional[int] = Query(None),
    categoria: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_staff_or_professor),
):
    items, _ = svc.listar(db, aula_id=aula_id, turma_id=turma_id, categoria=categoria, page=page, page_size=page_size)
    return items


@router.post("/", response_model=MaterialOut, status_code=status.HTTP_201_CREATED)
def criar(
    dados: MaterialCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_professor),
):
    material = svc.criar(db, dados, current_user)
    audit_log_repo.registrar(db, current_user, request, "CREATE", "material", material["id"])
    db.commit()
    return material


@router.get("/{material_id}", response_model=MaterialOut)
def buscar(
    material_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff_or_professor),
):
    return svc.buscar(db, material_id)


@router.patch("/{material_id}", response_model=MaterialOut)
def atualizar(
    material_id: int,
    dados: MaterialUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_professor),
):
    material = svc.atualizar(db, material_id, dados, current_user)
    audit_log_repo.registrar(db, current_user, request, "UPDATE", "material", material_id)
    db.commit()
    return material


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar(
    material_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_professor),
):
    audit_log_repo.registrar(db, current_user, request, "DELETE", "material", material_id)
    svc.deletar(db, material_id, current_user)


@router.post("/{material_id}/upload", response_model=MaterialOut)
def upload_arquivo(
    material_id: int,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_professor),
):
    material = svc.fazer_upload(db, material_id, file, current_user)
    audit_log_repo.registrar(db, current_user, request, "UPDATE", "material", material_id, detalhes={"acao": "upload_arquivo"})
    db.commit()
    return material


@router.get("/{material_id}/download")
def download(
    material_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff_or_professor),
):
    url = svc.gerar_url_download(db, material_id)
    return {"url": url}
