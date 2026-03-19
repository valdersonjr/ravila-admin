from sqlalchemy.orm import Session

from app.models.reposicao import ReposicaoPendente


def criar(db: Session, aluno_id: int, aula_origem_id: int) -> ReposicaoPendente:
    r = ReposicaoPendente(aluno_id=aluno_id, aula_origem_id=aula_origem_id, status="pendente")
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


def listar_pendentes_por_aluno(db: Session, aluno_id: int) -> list[ReposicaoPendente]:
    return (
        db.query(ReposicaoPendente)
        .filter(ReposicaoPendente.aluno_id == aluno_id, ReposicaoPendente.status == "pendente")
        .all()
    )


def listar_pendentes(db: Session) -> list[ReposicaoPendente]:
    return (
        db.query(ReposicaoPendente)
        .filter(ReposicaoPendente.status == "pendente")
        .all()
    )


def usar(db: Session, reposicao_id: int, aula_reposicao_id: int) -> ReposicaoPendente | None:
    r = db.query(ReposicaoPendente).filter(ReposicaoPendente.id == reposicao_id).first()
    if r:
        r.status = "usada"
        r.aula_reposicao_id = aula_reposicao_id
        db.commit()
        db.refresh(r)
    return r


def buscar_pendente(db: Session, aluno_id: int, aula_origem_id: int) -> ReposicaoPendente | None:
    return (
        db.query(ReposicaoPendente)
        .filter(
            ReposicaoPendente.aluno_id == aluno_id,
            ReposicaoPendente.aula_origem_id == aula_origem_id,
            ReposicaoPendente.status == "pendente",
        )
        .first()
    )
