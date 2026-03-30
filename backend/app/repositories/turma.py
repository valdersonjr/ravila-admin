from sqlalchemy.orm import Session

from app.models.turma import Turma, HorarioTurma


def listar(
    db: Session,
    professor_id: int | None = None,
    status: str | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[Turma], int]:
    query = db.query(Turma).filter(Turma.status != "excluida")
    if professor_id:
        query = query.filter(Turma.professor_id == professor_id)
    if status:
        query = query.filter(Turma.status == status)
    if search:
        query = query.filter(Turma.nome.ilike(f"%{search}%"))
    total = query.count()
    items = query.order_by(Turma.nome.asc()).offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def listar_todos(
    db: Session,
    professor_id: int | None = None,
    status: str | None = None,
) -> list[Turma]:
    query = db.query(Turma).filter(Turma.status != "excluida")
    if professor_id:
        query = query.filter(Turma.professor_id == professor_id)
    if status:
        query = query.filter(Turma.status == status)
    return query.order_by(Turma.nome.asc()).all()


def buscar_por_id(db: Session, id: int) -> Turma | None:
    return db.query(Turma).filter(Turma.id == id).first()


def criar(db: Session, dados: dict) -> Turma:
    turma = Turma(**dados)
    db.add(turma)
    db.commit()
    db.refresh(turma)
    return turma


def atualizar(db: Session, turma: Turma, dados: dict) -> Turma:
    for key, value in dados.items():
        setattr(turma, key, value)
    db.commit()
    db.refresh(turma)
    return turma


def buscar_horario(db: Session, horario_id: int) -> HorarioTurma | None:
    return db.query(HorarioTurma).filter(HorarioTurma.id == horario_id).first()


def criar_horario(db: Session, dados: dict) -> HorarioTurma:
    horario = HorarioTurma(**dados)
    db.add(horario)
    db.commit()
    db.refresh(horario)
    return horario


def deletar_horario(db: Session, horario: HorarioTurma) -> None:
    db.delete(horario)
    db.commit()
