from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.aula import Aula
from app.repositories import aula as aula_repo
from app.repositories import professor as professor_repo
from app.repositories import turma as turma_repo
from app.schemas.aula import AulaCreate


def listar(
    db: Session,
    turma_id: int | None = None,
    professor_id: int | None = None,
    data_inicio: date | None = None,
    data_fim: date | None = None,
    status_filter: str | None = None,
) -> list[Aula]:
    return aula_repo.listar(db, turma_id, professor_id, data_inicio, data_fim, status_filter)


def buscar(db: Session, id: int) -> Aula:
    aula = aula_repo.buscar_por_id(db, id)
    if not aula:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aula não encontrada",
        )
    return aula


def criar(db: Session, dados: AulaCreate, pendente_aprovacao: bool = False) -> Aula:
    turma = turma_repo.buscar_por_id(db, dados.turma_id)
    if not turma:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turma não encontrada",
        )
    professor = professor_repo.buscar_por_pessoa_id(db, dados.professor_id)
    if not professor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professor não encontrado",
        )
    if aula_repo.professor_tem_aula_no_dia(db, dados.professor_id, dados.data):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Professor já possui uma aula agendada neste dia.",
        )
    professor_nome = professor.pessoa.nome if professor.pessoa else ""
    payload = {
        "turma_id": dados.turma_id,
        "data": dados.data,
        "hora_inicio": dados.hora_inicio,
        "hora_fim": dados.hora_fim,
        "professor_id": dados.professor_id,
        "professor_nome_snapshot": professor_nome,
        "tipo": dados.tipo,
        "status": "pendente_aprovacao" if pendente_aprovacao else "agendada",
    }
    return aula_repo.criar(db, payload)


def atualizar_status(db: Session, aula_id: int, novo_status: str) -> Aula:
    aula = buscar(db, aula_id)
    return aula_repo.atualizar(db, aula, {"status": novo_status})


def aprovar(db: Session, aula_id: int) -> Aula:
    aula = buscar(db, aula_id)
    if aula.status != "pendente_aprovacao":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aula não está pendente de aprovação",
        )
    return aula_repo.atualizar(db, aula, {"status": "agendada"})


def substituir_professor(db: Session, aula_id: int, professor_id: int) -> Aula:
    aula = buscar(db, aula_id)
    professor = professor_repo.buscar_por_pessoa_id(db, professor_id)
    if not professor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professor não encontrado",
        )
    if aula_repo.professor_tem_aula_no_dia(db, professor_id, aula.data, exclude_id=aula_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Professor já possui uma aula agendada neste dia.",
        )
    return aula_repo.atualizar(db, aula, {
        "professor_id": professor_id,
        "professor_nome_snapshot": professor.pessoa.nome if professor.pessoa else "",
    })


def remarcar(
    db: Session,
    aula_id: int,
    nova_data: date,
    hora_inicio: str,
    hora_fim: str,
) -> Aula:
    aula_origem = buscar(db, aula_id)
    aula_repo.atualizar(db, aula_origem, {"status": "cancelada"})
    nova_aula = aula_repo.criar(db, {
        "turma_id": aula_origem.turma_id,
        "data": nova_data,
        "hora_inicio": hora_inicio,
        "hora_fim": hora_fim,
        "professor_id": aula_origem.professor_id,
        "professor_nome_snapshot": aula_origem.professor_nome_snapshot,
        "tipo": "substitutiva",
        "status": "agendada",
        "aula_origem_id": aula_origem.id,
    })
    return nova_aula
