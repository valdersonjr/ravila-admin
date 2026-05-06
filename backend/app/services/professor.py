from calendar import monthrange
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.constants import AulaStatus, MatriculaStatus
from app.models.aula import Aula
from app.models.matricula import Matricula
from app.models.presenca import Presenca
from app.models.turma import Turma
from app.models.professor import Professor
from app.repositories import professor as professor_repo
from app.repositories import pessoa as pessoa_repo
from app.schemas.professor import ProfessorCreate, ProfessorUpdate, ProfessorDashboardOut, MesHistorico


def listar(db: Session) -> list[Professor]:
    return professor_repo.listar(db)


def buscar(db: Session, pessoa_id: int) -> Professor:
    professor = professor_repo.buscar_por_pessoa_id(db, pessoa_id)
    if not professor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professor não encontrado",
        )
    return professor


def criar(db: Session, dados: ProfessorCreate) -> Professor:
    pessoa = pessoa_repo.buscar_por_id(db, dados.pessoa_id)
    if not pessoa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pessoa não encontrada",
        )
    if professor_repo.buscar_por_pessoa_id(db, dados.pessoa_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta pessoa já é um professor",
        )
    return professor_repo.criar(db, dados.model_dump())


def atualizar(db: Session, pessoa_id: int, dados: ProfessorUpdate) -> Professor:
    professor = buscar(db, pessoa_id)
    return professor_repo.atualizar(db, professor, dados.model_dump(exclude_unset=True))


# ── Dashboard helpers ────────────────────────────────────────────────────────

def _turmas_com_contagem(db: Session, professor_id: int) -> list[dict]:
    turmas = db.query(Turma).filter(Turma.professor_id == professor_id).all()
    return [
        {
            "id": t.id,
            "nome": t.nome,
            "status": t.status,
            "num_alunos": db.query(Matricula)
                .filter(Matricula.turma_id == t.id, Matricula.status == MatriculaStatus.ATIVA)
                .count(),
        }
        for t in turmas
    ]


def _contagem_aulas(db: Session, professor_id: int) -> dict:
    base = db.query(Aula).filter(Aula.professor_id == professor_id, Aula.deletado == False)
    return {
        "total": base.count(),
        "realizadas": base.filter(Aula.status == AulaStatus.REALIZADA).count(),
        "canceladas": base.filter(Aula.status == AulaStatus.CANCELADA).count(),
        "agendadas": base.filter(Aula.status == AulaStatus.AGENDADA).count(),
    }


def _contagem_aulas_mes(db: Session, professor_id: int, primeiro_dia: date) -> dict:
    base_mes = db.query(Aula).filter(
        Aula.professor_id == professor_id,
        Aula.data >= primeiro_dia,
        Aula.deletado == False,
    )
    return {
        "realizadas": base_mes.filter(Aula.status == AulaStatus.REALIZADA).count(),
        "agendadas": base_mes.filter(Aula.status == AulaStatus.AGENDADA).count(),
        "canceladas": base_mes.filter(Aula.status == AulaStatus.CANCELADA).count(),
    }


def _presenca_media(
    db: Session,
    professor_id: int,
    data_inicio: date | None = None,
    data_fim: date | None = None,
) -> float | None:
    filtros = [
        Aula.professor_id == professor_id,
        Aula.status == AulaStatus.REALIZADA,
        Aula.deletado == False,
    ]
    if data_inicio:
        filtros.append(Aula.data >= data_inicio)
    if data_fim:
        filtros.append(Aula.data <= data_fim)

    base = db.query(Presenca).join(Aula, Presenca.aula_id == Aula.id).filter(*filtros)
    total = base.count()
    if total == 0:
        return None
    presentes = base.filter(Presenca.presente == True).count()
    return presentes / total


def _historico_mensal(db: Session, professor_id: int, hoje: date) -> list[MesHistorico]:
    historico = []
    for meses_atras in range(6, 0, -1):
        ano = hoje.year
        mes = hoje.month - meses_atras
        while mes <= 0:
            mes += 12
            ano -= 1
        primeiro = date(ano, mes, 1)
        ultimo = date(ano, mes, monthrange(ano, mes)[1])

        realizadas = db.query(Aula).filter(
            Aula.professor_id == professor_id,
            Aula.status == AulaStatus.REALIZADA,
            Aula.data >= primeiro,
            Aula.data <= ultimo,
            Aula.deletado == False,
        ).count()

        canceladas = db.query(Aula).filter(
            Aula.professor_id == professor_id,
            Aula.status == AulaStatus.CANCELADA,
            Aula.data >= primeiro,
            Aula.data <= ultimo,
            Aula.deletado == False,
        ).count()

        historico.append(MesHistorico(
            mes=f"{mes:02d}/{ano}",
            realizadas=realizadas,
            canceladas=canceladas,
            presenca_media=_presenca_media(db, professor_id, primeiro, ultimo),
        ))
    return historico


# ── Dashboard principal ──────────────────────────────────────────────────────

def dashboard(db: Session, pessoa_id: int) -> ProfessorDashboardOut:
    professor = buscar(db, pessoa_id)
    hoje = date.today()
    primeiro_dia_mes = date(hoje.year, hoje.month, 1)

    turmas = _turmas_com_contagem(db, pessoa_id)
    contagem = _contagem_aulas(db, pessoa_id)
    contagem_mes = _contagem_aulas_mes(db, pessoa_id, primeiro_dia_mes)

    return ProfessorDashboardOut(
        professor_id=professor.pessoa_id,
        nome=professor.pessoa.nome,
        cpf=professor.pessoa.cpf,
        ativo=professor.ativo,
        turmas=turmas,
        aulas={
            **contagem,
            "mes_atual": {
                **contagem_mes,
                "presenca_media": _presenca_media(db, pessoa_id, primeiro_dia_mes),
            },
        },
        presenca_media=_presenca_media(db, pessoa_id),
        historico_mensal=_historico_mensal(db, pessoa_id, hoje),
    )
