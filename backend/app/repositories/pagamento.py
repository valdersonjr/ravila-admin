from calendar import monthrange
from datetime import date

from sqlalchemy.orm import Session

from app.models.aula import Aula
from app.models.pagamento import PagamentoProfessor


def listar_professores(
    db: Session,
    professor_id: int | None = None,
    referencia: str | None = None,
) -> list[PagamentoProfessor]:
    query = db.query(PagamentoProfessor)
    if professor_id:
        query = query.filter(PagamentoProfessor.professor_id == professor_id)
    if referencia:
        query = query.filter(PagamentoProfessor.referencia == referencia)
    return query.order_by(PagamentoProfessor.created_at.desc()).all()


def buscar_professor(db: Session, id: int) -> PagamentoProfessor | None:
    return db.query(PagamentoProfessor).filter(PagamentoProfessor.id == id).first()


def criar_professor(db: Session, dados: dict) -> PagamentoProfessor:
    pagamento = PagamentoProfessor(**dados)
    db.add(pagamento)
    db.commit()
    db.refresh(pagamento)
    return pagamento


def atualizar_professor(
    db: Session, pagamento: PagamentoProfessor, dados: dict
) -> PagamentoProfessor:
    for key, value in dados.items():
        setattr(pagamento, key, value)
    db.commit()
    db.refresh(pagamento)
    return pagamento


def contar_aulas_realizadas(db: Session, professor_id: int, referencia: str) -> int:
    mes_str, ano_str = referencia.split("/")
    mes_int = int(mes_str)
    ano_int = int(ano_str)
    primeiro_dia = date(ano_int, mes_int, 1)
    ultimo_dia = date(ano_int, mes_int, monthrange(ano_int, mes_int)[1])
    return (
        db.query(Aula)
        .filter(
            Aula.professor_id == professor_id,
            Aula.status == "realizada",
            Aula.data >= primeiro_dia,
            Aula.data <= ultimo_dia,
        )
        .count()
    )
