from sqlalchemy.orm import Session, joinedload

from app.models.contrato import Contrato
from app.models.aluno import Aluno
from app.models.pessoa import Pessoa


def _com_joins(db: Session):
    return db.query(Contrato).options(
        joinedload(Contrato.alunos).joinedload(Aluno.pessoa),
        joinedload(Contrato.alunos).joinedload(Aluno.nivel),
        joinedload(Contrato.alunos).joinedload(Aluno.responsavel),
        joinedload(Contrato.contratante),
    )


def listar(
    db: Session,
    status: str | None = None,
    aluno_id: int | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Contrato], int]:
    # Query de IDs com filtros (sem joinedload para performance)
    q = db.query(Contrato.id)
    if status:
        q = q.filter(Contrato.status == status)
    if aluno_id is not None:
        q = q.filter(Contrato.alunos.any(Aluno.pessoa_id == aluno_id))
    if search:
        termo = f"%{search}%"
        q = (
            q.join(Contrato.alunos)
            .join(Pessoa, Pessoa.id == Aluno.pessoa_id)
            .filter(Pessoa.nome.ilike(termo))
            .distinct()
        )
    total = q.count()
    ids = [row[0] for row in q.order_by(Contrato.id.desc()).offset((page - 1) * page_size).limit(page_size).all()]
    if not ids:
        return [], total
    items = _com_joins(db).filter(Contrato.id.in_(ids)).all()
    items.sort(key=lambda c: ids.index(c.id))
    return items, total


def buscar_por_id(db: Session, contrato_id: int) -> Contrato | None:
    return _com_joins(db).filter(Contrato.id == contrato_id).first()


def criar(db: Session, dados: dict, alunos: list[Aluno]) -> Contrato:
    contrato = Contrato(**dados)
    contrato.alunos = alunos
    db.add(contrato)
    db.commit()
    return buscar_por_id(db, contrato.id)  # type: ignore[return-value]


def atualizar(db: Session, contrato: Contrato, dados: dict, alunos: list[Aluno] | None = None) -> Contrato:
    for key, value in dados.items():
        setattr(contrato, key, value)
    if alunos is not None:
        contrato.alunos = alunos
    db.commit()
    return buscar_por_id(db, contrato.id)  # type: ignore[return-value]
