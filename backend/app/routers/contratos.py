from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, Query, UploadFile, File, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_staff
from app.models.contrato import Contrato
from app.models.user import User
from app.repositories import contrato as contrato_repo
from app.schemas.contrato import ContratoCreate, ContratoUpdate, ContratoStatusUpdate, ContratoOut, ContratoListOut
from app.services import contrato as contrato_service
from app.services import s3 as s3_service

router = APIRouter(prefix="/contratos", tags=["contratos"])


@router.get("/indicadores")
def indicadores(
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    ativos = db.query(Contrato).filter(Contrato.status == "ativo").all()
    hoje = date.today()
    em_30_dias = hoje + timedelta(days=30)

    receita = Decimal("0")
    for c in ativos:
        v = c.valor_mensalidade
        if c.desconto_percentual:
            v = v * (1 - c.desconto_percentual / 100)
        elif c.desconto_valor:
            v = max(v - c.desconto_valor, Decimal("0"))
        receita += v

    return {
        "receita_mensal_prevista": float(receita),
        "total_ativos": len(ativos),
        "expirando_30_dias": sum(1 for c in ativos if c.data_fim <= em_30_dias),
        "sem_assinado": sum(1 for c in ativos if not c.contrato_assinado_key),
        "rascunhos": db.query(Contrato).filter(Contrato.status == "rascunho").count(),
    }


@router.get("/", response_model=ContratoListOut)
def listar(
    status_filter: Optional[str] = Query(None, alias="status"),
    aluno_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    return contrato_service.listar(db, status_filter, aluno_id, search, page, page_size)


@router.post("/", response_model=ContratoOut, status_code=status.HTTP_201_CREATED)
def criar(
    body: ContratoCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    return contrato_service.criar(db, body)


@router.get("/{contrato_id}", response_model=ContratoOut)
def buscar(
    contrato_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    return contrato_service.buscar(db, contrato_id)


@router.put("/{contrato_id}", response_model=ContratoOut)
def atualizar(
    contrato_id: int,
    body: ContratoUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    return contrato_service.atualizar(db, contrato_id, body)


@router.patch("/{contrato_id}/status", response_model=ContratoOut)
def atualizar_status(
    contrato_id: int,
    body: ContratoStatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    return contrato_service.atualizar_status(db, contrato_id, body)


@router.post("/{contrato_id}/upload-assinado", response_model=ContratoOut)
def upload_assinado(
    contrato_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    contrato = contrato_service.buscar(db, contrato_id)
    file_bytes = file.file.read()
    key = s3_service.upload_contrato(file_bytes, contrato_id, file.filename or "assinado.pdf")
    return contrato_repo.atualizar(db, contrato, {"contrato_assinado_key": key})


@router.get("/{contrato_id}/download-assinado")
def download_assinado(
    contrato_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    contrato = contrato_service.buscar(db, contrato_id)
    if not contrato.contrato_assinado_key:
        return Response(status_code=404)
    key = contrato.contrato_assinado_key
    ext = key.rsplit(".", 1)[-1].lower() if "." in key else "pdf"
    content_type = "application/pdf" if ext == "pdf" else f"image/{ext}"
    file_bytes = s3_service.baixar_arquivo(key)
    nome = contrato.contratante.nome.replace(" ", "_")
    data = str(contrato.data_inicio)
    filename = f"contrato_{contrato_id}_{nome}_{data}.{ext}"
    return Response(
        content=file_bytes,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{contrato_id}/instrucoes-gerais")
def baixar_instrucoes_gerais(
    contrato_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    pdf_bytes = contrato_service.gerar_instrucoes_gerais(db, contrato_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="instrucoes_gerais_{contrato_id}.pdf"'},
    )


@router.get("/{contrato_id}/pdf")
def baixar_pdf(
    contrato_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    pdf_bytes = contrato_service.gerar_pdf(db, contrato_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="contrato_{contrato_id}.pdf"'},
    )
