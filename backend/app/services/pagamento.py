import os
import shutil
from decimal import Decimal

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.models.pagamento import PagamentoProfessor
from app.repositories import pagamento as pagamento_repo
from app.repositories import professor as professor_repo
from app.schemas.pagamento import (
    PagamentoProfessorCreate,
    PagamentoProfessorUpdate,
)

UPLOADS_BASE = "/app/uploads"


def listar_professores(
    db: Session,
    professor_id: int | None = None,
    referencia: str | None = None,
) -> list[PagamentoProfessor]:
    return pagamento_repo.listar_professores(db, professor_id, referencia)


def criar_professor(db: Session, dados: PagamentoProfessorCreate) -> PagamentoProfessor:
    professor = professor_repo.buscar_por_pessoa_id(db, dados.professor_id)
    if not professor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professor não encontrado",
        )
    nome_snapshot = professor.pessoa.nome if professor.pessoa else ""
    payload = {
        "professor_id": dados.professor_id,
        "professor_nome_snapshot": nome_snapshot,
        "tipo_contrato_snapshot": professor.tipo_contrato,
        "referencia": dados.referencia,
        "valor_total": dados.valor_total,
        "aulas_realizadas_snapshot": dados.aulas_realizadas_snapshot,
        "forma": dados.forma,
        "data_pagamento": dados.data_pagamento,
    }
    return pagamento_repo.criar_professor(db, payload)


def atualizar_professor(
    db: Session, pagamento_id: int, dados: PagamentoProfessorUpdate
) -> PagamentoProfessor:
    pagamento = pagamento_repo.buscar_professor(db, pagamento_id)
    if not pagamento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pagamento não encontrado",
        )
    return pagamento_repo.atualizar_professor(
        db, pagamento, dados.model_dump(exclude_unset=True)
    )


def upload_comprovante_professor(
    db: Session,
    pagamento_id: int,
    file: UploadFile,
    filename: str,
) -> PagamentoProfessor:
    pagamento = pagamento_repo.buscar_professor(db, pagamento_id)
    if not pagamento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pagamento não encontrado",
        )
    ext = os.path.splitext(filename)[1] if filename else ".bin"
    folder = os.path.join(UPLOADS_BASE, "pagamentos_professor", str(pagamento_id))
    os.makedirs(folder, exist_ok=True)
    file_path = os.path.join(folder, f"comprovante{ext}")
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    url = f"/uploads/pagamentos_professor/{pagamento_id}/comprovante{ext}"
    return pagamento_repo.atualizar_professor(db, pagamento, {"comprovante_url": url})


def calcular_professor(
    db: Session, professor_id: int, referencia: str
) -> dict:
    professor = professor_repo.buscar_por_pessoa_id(db, professor_id)
    if not professor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professor não encontrado",
        )
    try:
        mes_str, ano_str = referencia.split("/")
        int(mes_str)
        int(ano_str)
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de referência inválido. Use MM/YYYY",
        )
    aulas_realizadas = pagamento_repo.contar_aulas_realizadas(db, professor_id, referencia)
    valor_por_aula = professor.valor_por_aula if professor.tipo_contrato == "pj" else None
    if professor.tipo_contrato != "pj":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cálculo por aula não disponível para professores CLT",
        )
    valor_calculado = Decimal(str(valor_por_aula)) * aulas_realizadas if valor_por_aula is not None else None
    return {
        "professor_id": professor_id,
        "referencia": referencia,
        "aulas_realizadas": aulas_realizadas,
        "valor_por_aula": valor_por_aula,
        "valor_calculado": valor_calculado,
    }
