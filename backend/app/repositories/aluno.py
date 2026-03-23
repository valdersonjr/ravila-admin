from sqlalchemy.orm import Session, joinedload

from app.models.aluno import Aluno
from app.models.matricula import Matricula
from app.models.pessoa import Pessoa
from app.models.turma import Turma


def listar(
    db: Session,
    status: str | None = None,
    search: str | None = None,
    nivel_id: int | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Aluno], int]:
    query = db.query(Aluno).join(Pessoa, Aluno.pessoa_id == Pessoa.id)
    if status:
        query = query.filter(Aluno.status == status)
    if nivel_id is not None:
        query = query.filter(Aluno.nivel_id == nivel_id)
    if search:
        termo = f"%{search}%"
        query = query.filter(
            Pessoa.nome.ilike(termo) | Pessoa.cpf.ilike(termo)
        )
    total = query.count()
    items = (
        query
        .options(joinedload(Aluno.pessoa), joinedload(Aluno.nivel), joinedload(Aluno.responsavel))
        .order_by(Pessoa.nome)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return items, total


def aniversarios_semanas(db: Session, datas_ddmm: list[str], professor_id: int | None = None) -> list[Aluno]:
    query = (
        db.query(Aluno)
        .join(Pessoa, Aluno.pessoa_id == Pessoa.id)
        .filter(Aluno.aniversario.in_(datas_ddmm), Aluno.status == "ativo")
    )
    if professor_id is not None:
        query = query.join(Matricula, Matricula.aluno_id == Aluno.pessoa_id).join(Turma, Turma.id == Matricula.turma_id).filter(Turma.professor_id == professor_id)
    return query.order_by(Aluno.aniversario).all()


def alunos_com_aniversario(db: Session, professor_id: int | None = None) -> list[Aluno]:
    query = (
        db.query(Aluno)
        .join(Pessoa, Aluno.pessoa_id == Pessoa.id)
        .filter(Aluno.aniversario.isnot(None), Aluno.status == "ativo")
    )
    if professor_id is not None:
        query = query.join(Matricula, Matricula.aluno_id == Aluno.pessoa_id).join(Turma, Turma.id == Matricula.turma_id).filter(Turma.professor_id == professor_id)
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
