from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import DateTime, String, cast, func, or_
from sqlalchemy.orm import Session, joinedload

from app.constants import AulaStatus
from app.models.aula import Aula
from app.models.turma import Turma

_BR = ZoneInfo("America/Sao_Paulo")


def _aula_fim_expr():
    """Expressão SQL: (data || ' ' || hora_fim)::timestamp — sem fuso."""
    return cast(func.concat(cast(Aula.data, String), " ", Aula.hora_fim), DateTime)


def _agora_br() -> datetime:
    return datetime.now(_BR).replace(tzinfo=None)


def listar(
    db: Session,
    turma_id: int | None = None,
    professor_id: int | None = None,
    data_inicio: date | None = None,
    data_fim: date | None = None,
    status: str | None = None,
    aluno_id: int | None = None,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[Aula], int]:
    query = db.query(Aula).filter(Aula.deletado == False)
    if turma_id:
        query = query.filter(Aula.turma_id == turma_id)
    if professor_id:
        query = query.filter(Aula.professor_id == professor_id)
    if data_inicio:
        query = query.filter(Aula.data >= data_inicio)
    if data_fim:
        query = query.filter(Aula.data <= data_fim)
    if status:
        if status == AulaStatus.REALIZADA:
            aula_fim = _aula_fim_expr()
            query = query.filter(
                or_(
                    Aula.status == AulaStatus.REALIZADA,
                    (Aula.status == AulaStatus.AGENDADA) & (aula_fim < _agora_br()),
                )
            )
        elif status == AulaStatus.AGENDADA:
            aula_fim = _aula_fim_expr()
            query = query.filter(
                Aula.status == AulaStatus.AGENDADA,
                aula_fim >= _agora_br(),
            )
        else:
            query = query.filter(Aula.status == status)
    if aluno_id:
        query = query.filter(Aula.aluno_id == aluno_id)
    total = query.count()
    items = (
        query
        .options(joinedload(Aula.turma))
        .order_by(Aula.data.asc(), Aula.hora_inicio)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return items, total


def buscar_por_id(db: Session, id: int) -> Aula | None:
    return db.query(Aula).filter(Aula.id == id, Aula.deletado == False).first()


def professor_tem_aula_no_dia(db: Session, professor_id: int, data: date, exclude_id: int | None = None) -> bool:
    query = (
        db.query(Aula)
        .filter(
            Aula.professor_id == professor_id,
            Aula.data == data,
            Aula.status.in_(["agendada", "pendente_aprovacao"]),
            Aula.deletado == False,
        )
    )
    if exclude_id:
        query = query.filter(Aula.id != exclude_id)
    return query.first() is not None


def buscar_conflito_horario(
    db: Session,
    professor_id: int,
    data: date,
    hora_inicio: str,
    hora_fim: str,
    exclude_id: int | None = None,
) -> Aula | None:
    """Retorna a primeira aula que conflita com o horário informado para o professor.

    Dois horários conflitam quando se sobrepõem:
        hora_inicio_existente < hora_fim_nova  AND  hora_fim_existente > hora_inicio_nova
    """
    query = (
        db.query(Aula)
        .filter(
            Aula.professor_id == professor_id,
            Aula.data == data,
            Aula.status.in_(["agendada", "pendente_aprovacao"]),
            Aula.hora_inicio < hora_fim,
            Aula.hora_fim > hora_inicio,
            Aula.deletado == False,
        )
    )
    if exclude_id:
        query = query.filter(Aula.id != exclude_id)
    return query.first()


def buscar_por_turma_e_data(db: Session, turma_id: int, data: date) -> Aula | None:
    return (
        db.query(Aula)
        .filter(Aula.turma_id == turma_id, Aula.data == data, Aula.deletado == False)
        .first()
    )


def buscar_datas_existentes(db: Session, turma_id: int, data_inicio: date, data_fim: date) -> set[date]:
    """Retorna o conjunto de datas que já possuem aula para a turma no período."""
    rows = (
        db.query(Aula.data)
        .filter(Aula.turma_id == turma_id, Aula.data >= data_inicio, Aula.data <= data_fim, Aula.deletado == False)
        .all()
    )
    return {row.data for row in rows}


def criar(db: Session, dados: dict) -> Aula:
    aula = Aula(**dados)
    db.add(aula)
    db.commit()
    db.refresh(aula)
    return aula


def deletar(db: Session, aula: Aula) -> None:
    aula.deletado = True
    db.commit()


def atualizar(db: Session, aula: Aula, dados: dict) -> Aula:
    for key, value in dados.items():
        setattr(aula, key, value)
    db.commit()
    db.refresh(aula)
    return aula
