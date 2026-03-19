from datetime import date

from sqlalchemy.orm import Session

from app.models.aula import Aula


def listar(
    db: Session,
    turma_id: int | None = None,
    professor_id: int | None = None,
    data_inicio: date | None = None,
    data_fim: date | None = None,
    status: str | None = None,
) -> list[Aula]:
    query = db.query(Aula)
    if turma_id:
        query = query.filter(Aula.turma_id == turma_id)
    if professor_id:
        query = query.filter(Aula.professor_id == professor_id)
    if data_inicio:
        query = query.filter(Aula.data >= data_inicio)
    if data_fim:
        query = query.filter(Aula.data <= data_fim)
    if status:
        query = query.filter(Aula.status == status)
    return query.order_by(Aula.data, Aula.hora_inicio).all()


def buscar_por_id(db: Session, id: int) -> Aula | None:
    return db.query(Aula).filter(Aula.id == id).first()


def professor_tem_aula_no_dia(db: Session, professor_id: int, data: date, exclude_id: int | None = None) -> bool:
    query = (
        db.query(Aula)
        .filter(
            Aula.professor_id == professor_id,
            Aula.data == data,
            Aula.status.in_(["agendada", "pendente_aprovacao"]),
        )
    )
    if exclude_id:
        query = query.filter(Aula.id != exclude_id)
    return query.first() is not None


def buscar_por_turma_e_data(db: Session, turma_id: int, data: date) -> Aula | None:
    return (
        db.query(Aula)
        .filter(Aula.turma_id == turma_id, Aula.data == data)
        .first()
    )


def criar(db: Session, dados: dict) -> Aula:
    aula = Aula(**dados)
    db.add(aula)
    db.commit()
    db.refresh(aula)
    return aula


def atualizar(db: Session, aula: Aula, dados: dict) -> Aula:
    for key, value in dados.items():
        setattr(aula, key, value)
    db.commit()
    db.refresh(aula)
    return aula
