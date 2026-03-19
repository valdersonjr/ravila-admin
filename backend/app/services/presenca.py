from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.presenca import Presenca
from app.repositories import presenca as presenca_repo
from app.repositories import aula as aula_repo
from app.schemas.presenca import PresencaItem


def _verificar_aula_iniciada(aula) -> None:
    aula_inicio = datetime.combine(aula.data, aula.hora_inicio)
    if datetime.now() < aula_inicio:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Presenças só podem ser registradas após o início da aula.",
        )


def listar_por_aula(db: Session, aula_id: int) -> list[Presenca]:
    aula = aula_repo.buscar_por_id(db, aula_id)
    if not aula:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aula não encontrada",
        )
    return presenca_repo.listar_por_aula(db, aula_id)


def adicionar(db: Session, aula_id: int, item: PresencaItem) -> Presenca:
    aula = aula_repo.buscar_por_id(db, aula_id)
    if not aula:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aula não encontrada")
    existing = presenca_repo.buscar(db, aula_id, item.aluno_id)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Já está na lista desta aula")
    return presenca_repo.criar(db, {
        "aula_id": aula_id,
        "aluno_id": item.aluno_id,
        "tipo": item.tipo,
        "presente": item.presente,
    })


def registrar_batch(db: Session, aula_id: int, items: list[PresencaItem]) -> list[Presenca]:
    aula = aula_repo.buscar_por_id(db, aula_id)
    if not aula:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aula não encontrada",
        )
    _verificar_aula_iniciada(aula)
    for item in items:
        presenca = presenca_repo.buscar(db, aula_id, item.aluno_id)
        if presenca:
            presenca_repo.atualizar(db, presenca, {"tipo": item.tipo, "presente": item.presente})
        else:
            presenca_repo.criar(db, {
                "aula_id": aula_id,
                "aluno_id": item.aluno_id,
                "tipo": item.tipo,
                "presente": item.presente,
            })
    return presenca_repo.listar_por_aula(db, aula_id)
