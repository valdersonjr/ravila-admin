from sqlalchemy.orm import Session, joinedload
from sqlalchemy import exists, select

from app.models.aluno import Aluno
from app.models.matricula import Matricula
from app.models.pessoa import Pessoa
from app.models.turma import Turma
from app.models.contrato import Contrato, contrato_alunos


def _subq_matricula_ativa():
    return (
        select(Matricula.aluno_id)
        .join(Turma, Turma.id == Matricula.turma_id)
        .where(
            Matricula.aluno_id == Aluno.pessoa_id,
            Matricula.status == "ativa",
            Turma.status == "ativa",
        )
    )


def listar(
    db: Session,
    status: str | None = None,
    search: str | None = None,
    nivel_id: int | None = None,
    sem_contrato_ativo: bool = False,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Aluno], int]:
    query = db.query(Aluno).join(Pessoa, Aluno.pessoa_id == Pessoa.id)
    if status == "ativo":
        query = query.filter(exists(_subq_matricula_ativa()))
    elif status == "inativo":
        query = query.filter(~exists(_subq_matricula_ativa()))
    if nivel_id is not None:
        query = query.filter(Aluno.nivel_id == nivel_id)
    if sem_contrato_ativo:
        tem_contrato_ativo = (
            select(contrato_alunos.c.aluno_id)
            .join(Contrato, Contrato.id == contrato_alunos.c.contrato_id)
            .where(
                contrato_alunos.c.aluno_id == Aluno.pessoa_id,
                Contrato.status == "ativo",
            )
        )
        query = query.filter(~exists(tem_contrato_ativo))
    if search:
        termo = f"%{search}%"
        cpf_search = "".join(c for c in search if c.isdigit())
        cpf_pattern = f"%{cpf_search}%" if cpf_search else None
        query = query.filter(
            Pessoa.nome.ilike(termo)
            | (Pessoa.cpf.ilike(cpf_pattern) if cpf_pattern else False)
        )
    total = query.count()
    items = (
        query
        .options(
            joinedload(Aluno.pessoa),
            joinedload(Aluno.nivel),
            joinedload(Aluno.responsavel),
            joinedload(Aluno.matriculas).joinedload(Matricula.turma),
            joinedload(Aluno.contratos),
        )
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
        .filter(Aluno.aniversario.in_(datas_ddmm), exists(_subq_matricula_ativa()))
    )
    if professor_id is not None:
        query = query.join(Matricula, Matricula.aluno_id == Aluno.pessoa_id).join(Turma, Turma.id == Matricula.turma_id).filter(Turma.professor_id == professor_id)
    return (
        query
        .options(
            joinedload(Aluno.pessoa),
            joinedload(Aluno.nivel),
            joinedload(Aluno.responsavel),
            joinedload(Aluno.matriculas).joinedload(Matricula.turma),
            joinedload(Aluno.contratos),
        )
        .order_by(Aluno.aniversario)
        .all()
    )


def alunos_com_aniversario(db: Session, professor_id: int | None = None) -> list[Aluno]:
    query = (
        db.query(Aluno)
        .join(Pessoa, Aluno.pessoa_id == Pessoa.id)
        .filter(Aluno.aniversario.isnot(None), exists(_subq_matricula_ativa()))
    )
    if professor_id is not None:
        query = query.join(Matricula, Matricula.aluno_id == Aluno.pessoa_id).join(Turma, Turma.id == Matricula.turma_id).filter(Turma.professor_id == professor_id)
    return (
        query
        .options(
            joinedload(Aluno.pessoa),
            joinedload(Aluno.nivel),
            joinedload(Aluno.responsavel),
            joinedload(Aluno.matriculas).joinedload(Matricula.turma),
            joinedload(Aluno.contratos),
        )
        .all()
    )


def buscar_por_pessoa_id(db: Session, pessoa_id: int) -> Aluno | None:
    return (
        db.query(Aluno)
        .filter(Aluno.pessoa_id == pessoa_id)
        .options(
            joinedload(Aluno.pessoa),
            joinedload(Aluno.nivel),
            joinedload(Aluno.responsavel),
            joinedload(Aluno.matriculas).joinedload(Matricula.turma),
            joinedload(Aluno.contratos),
        )
        .first()
    )


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
