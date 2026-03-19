from datetime import date, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.turma import Turma, HorarioTurma
from app.repositories import turma as turma_repo
from app.repositories import nivel as nivel_repo
from app.repositories import professor as professor_repo
from app.repositories import aula as aula_repo
from app.schemas.turma import TurmaCreate, TurmaUpdate, HorarioTurmaCreate


def listar(
    db: Session,
    professor_id: int | None = None,
    status: str | None = None,
) -> list[Turma]:
    return turma_repo.listar(db, professor_id, status)


def buscar(db: Session, id: int) -> Turma:
    turma = turma_repo.buscar_por_id(db, id)
    if not turma:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turma não encontrada",
        )
    return turma


def criar(db: Session, dados: TurmaCreate) -> Turma:
    nivel = nivel_repo.buscar_por_id(db, dados.nivel_id)
    if not nivel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nível não encontrado",
        )
    professor = professor_repo.buscar_por_pessoa_id(db, dados.professor_id)
    if not professor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professor não encontrado",
        )
    return turma_repo.criar(db, dados.model_dump())


def atualizar(db: Session, id: int, dados: TurmaUpdate) -> Turma:
    turma = buscar(db, id)
    data = dados.model_dump(exclude_unset=True)
    if "nivel_id" in data:
        nivel = nivel_repo.buscar_por_id(db, data["nivel_id"])
        if not nivel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nível não encontrado",
            )
    if "professor_id" in data:
        professor = professor_repo.buscar_por_pessoa_id(db, data["professor_id"])
        if not professor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Professor não encontrado",
            )
    return turma_repo.atualizar(db, turma, data)


def adicionar_horario(db: Session, turma_id: int, dados: HorarioTurmaCreate) -> HorarioTurma:
    turma = buscar(db, turma_id)
    payload = {"turma_id": turma.id, **dados.model_dump()}
    return turma_repo.criar_horario(db, payload)


def remover_horario(db: Session, turma_id: int, horario_id: int) -> None:
    horario = turma_repo.buscar_horario(db, horario_id)
    if not horario or horario.turma_id != turma_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Horário não encontrado",
        )
    turma_repo.deletar_horario(db, horario)


def gerar_aulas(
    db: Session,
    turma_id: int,
    data_inicio: date,
    data_fim: date,
) -> int:
    turma = turma_repo.buscar_por_id(db, turma_id)
    if not turma:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turma não encontrada",
        )

    if data_fim < data_inicio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="data_fim deve ser maior ou igual a data_inicio",
        )

    horarios = turma.horarios
    if not horarios:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Turma não possui horários configurados",
        )

    professor_nome = ""
    if turma.professor and turma.professor.pessoa:
        professor_nome = turma.professor.pessoa.nome

    # Build a set of existing aula dates for this turma to skip duplicates
    existing_dates: set[date] = set()
    current_check = data_inicio
    while current_check <= data_fim:
        aula_existente = aula_repo.buscar_por_turma_e_data(db, turma_id, current_check)
        if aula_existente:
            existing_dates.add(current_check)
        current_check += timedelta(days=1)

    # Map dia_semana to horarios
    dia_map: dict[int, list] = {}
    for h in horarios:
        dia_map.setdefault(h.dia_semana, []).append(h)

    aulas_criadas = 0
    current = data_inicio
    while current <= data_fim:
        dia = current.weekday()
        if dia in dia_map:
            for h in dia_map[dia]:
                if current not in existing_dates:
                    aula_repo.criar(db, {
                        "turma_id": turma_id,
                        "data": current,
                        "hora_inicio": h.hora_inicio,
                        "hora_fim": h.hora_fim,
                        "professor_id": turma.professor_id,
                        "professor_nome_snapshot": professor_nome,
                        "tipo": "regular",
                        "status": "agendada",
                    })
                    existing_dates.add(current)
                    aulas_criadas += 1
        current += timedelta(days=1)

    return aulas_criadas
