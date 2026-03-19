from sqlalchemy.orm import Session

from app.models.aluno import Aluno
from app.models.pagamento import PagamentoAluno


def listar(
    db: Session,
    status: str | None = None,
    inadimplente: bool | None = None,
) -> list[Aluno]:
    query = db.query(Aluno)
    if status:
        query = query.filter(Aluno.status == status)
    if inadimplente is True:
        subquery = (
            db.query(PagamentoAluno.aluno_id)
            .filter(PagamentoAluno.status == "atrasado")
            .subquery()
        )
        query = query.filter(Aluno.pessoa_id.in_(subquery))
    return query.all()


def buscar_por_pessoa_id(db: Session, pessoa_id: int) -> Aluno | None:
    return db.query(Aluno).filter(Aluno.pessoa_id == pessoa_id).first()


def criar(db: Session, dados: dict) -> Aluno:
    aluno = Aluno(**dados)
    db.add(aluno)
    db.commit()
    db.refresh(aluno)
    return aluno


def atualizar(db: Session, aluno: Aluno, dados: dict) -> Aluno:
    for key, value in dados.items():
        setattr(aluno, key, value)
    db.commit()
    db.refresh(aluno)
    return aluno
