from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.aluno import Aluno
from app.repositories import aluno as aluno_repo
from app.repositories import pessoa as pessoa_repo
from app.repositories import nivel as nivel_repo
from datetime import date, timedelta

from app.schemas.aluno import AlunoCreate, AlunoUpdate, AlunoListOut


def listar(
    db: Session,
    status_filter: str | None = None,
    search: str | None = None,
    nivel_id: int | None = None,
    page: int = 1,
    page_size: int = 20,
) -> AlunoListOut:
    items, total = aluno_repo.listar(db, status_filter, search, nivel_id, page, page_size)
    return AlunoListOut(items=items, total=total, page=page, page_size=page_size)


def aniversarios_semanas(db: Session) -> list[Aluno]:
    hoje = date.today()
    # Segunda-feira da semana atual até domingo da próxima (14 dias)
    inicio = hoje - timedelta(days=hoje.weekday())
    fim = inicio + timedelta(days=13)
    datas = []
    current = inicio
    while current <= fim:
        datas.append(current.strftime("%d/%m"))
        current += timedelta(days=1)

    resultado = aluno_repo.aniversarios_semanas(db, datas)
    if len(resultado) >= 5:
        return resultado

    # Menos de 5 aniversários nas próximas duas semanas — complementa com os próximos em geral
    todos = aluno_repo.alunos_com_aniversario(db)

    def proxima_ocorrencia(ddmm: str) -> date:
        dia, mes = int(ddmm[:2]), int(ddmm[3:])
        candidato = date(hoje.year, mes, dia)
        if candidato < hoje:
            candidato = date(hoje.year + 1, mes, dia)
        return candidato

    ids_ja_incluidos = {a.pessoa_id for a in resultado}
    extras = [a for a in todos if a.pessoa_id not in ids_ja_incluidos]
    extras.sort(key=lambda a: proxima_ocorrencia(a.aniversario))  # type: ignore[arg-type]
    return resultado + extras[:5 - len(resultado)]


def buscar(db: Session, pessoa_id: int) -> Aluno:
    aluno = aluno_repo.buscar_por_pessoa_id(db, pessoa_id)
    if not aluno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aluno não encontrado",
        )
    return aluno


def criar(db: Session, dados: AlunoCreate) -> Aluno:
    pessoa = pessoa_repo.buscar_por_id(db, dados.pessoa_id)
    if not pessoa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pessoa não encontrada",
        )
    if aluno_repo.buscar_por_pessoa_id(db, dados.pessoa_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta pessoa já é um aluno",
        )
    if dados.nivel_id:
        nivel = nivel_repo.buscar_por_id(db, dados.nivel_id)
        if not nivel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nível não encontrado",
            )
    if not pessoa.menor_de_idade and not pessoa.cpf:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Para cadastrar um aluno maior de idade é necessário que a pessoa possua CPF",
        )
    if pessoa.menor_de_idade and not dados.responsavel_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aluno menor de idade requer responsável",
        )
    if dados.responsavel_id:
        responsavel = pessoa_repo.buscar_por_id(db, dados.responsavel_id)
        if not responsavel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Responsável não encontrado",
            )
        if not responsavel.cpf:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O responsável deve possuir CPF cadastrado",
            )
    return aluno_repo.criar(db, dados.model_dump())


def atualizar(db: Session, pessoa_id: int, dados: AlunoUpdate) -> Aluno:
    aluno = buscar(db, pessoa_id)
    data = dados.model_dump(exclude_unset=True)
    if "nivel_id" in data and data["nivel_id"] is not None:
        nivel = nivel_repo.buscar_por_id(db, data["nivel_id"])
        if not nivel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nível não encontrado",
            )
    return aluno_repo.atualizar(db, aluno, data)
