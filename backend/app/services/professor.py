from calendar import monthrange
from datetime import date
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.aula import Aula
from app.models.matricula import Matricula
from app.models.presenca import Presenca
from app.models.turma import Turma
from app.models.professor import Professor
from app.repositories import professor as professor_repo
from app.repositories import pessoa as pessoa_repo
from app.repositories import pagamento as pagamento_repo
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


def dashboard(db: Session, pessoa_id: int) -> ProfessorDashboardOut:
    professor = buscar(db, pessoa_id)
    hoje = date.today()

    # Turmas com contagem de alunos ativos
    turmas = db.query(Turma).filter(Turma.professor_id == pessoa_id).all()
    turmas_data = []
    for t in turmas:
        num_alunos = (
            db.query(Matricula)
            .filter(Matricula.turma_id == t.id, Matricula.status == "ativa")
            .count()
        )
        turmas_data.append({"id": t.id, "nome": t.nome, "status": t.status, "num_alunos": num_alunos})

    # Aulas — totais
    base = db.query(Aula).filter(Aula.professor_id == pessoa_id)
    total = base.count()
    realizadas = base.filter(Aula.status == "realizada").count()
    canceladas = base.filter(Aula.status == "cancelada").count()
    agendadas = base.filter(Aula.status == "agendada").count()

    # Aulas — mês atual
    primeiro_dia = date(hoje.year, hoje.month, 1)
    base_mes = db.query(Aula).filter(Aula.professor_id == pessoa_id, Aula.data >= primeiro_dia)
    realizadas_mes = base_mes.filter(Aula.status == "realizada").count()
    agendadas_mes = base_mes.filter(Aula.status == "agendada").count()
    canceladas_mes = base_mes.filter(Aula.status == "cancelada").count()

    # Presença média — mês atual
    total_presencas_mes = (
        db.query(Presenca)
        .join(Aula, Presenca.aula_id == Aula.id)
        .filter(Aula.professor_id == pessoa_id, Aula.status == "realizada", Aula.data >= primeiro_dia)
        .count()
    )
    presentes_mes = (
        db.query(Presenca)
        .join(Aula, Presenca.aula_id == Aula.id)
        .filter(Aula.professor_id == pessoa_id, Aula.status == "realizada",
                Aula.data >= primeiro_dia, Presenca.presente == True)
        .count()
    )
    presenca_media_mes = (presentes_mes / total_presencas_mes) if total_presencas_mes > 0 else None

    # Taxa de presença (aulas realizadas pelo professor)
    total_presencas = (
        db.query(Presenca)
        .join(Aula, Presenca.aula_id == Aula.id)
        .filter(Aula.professor_id == pessoa_id, Aula.status == "realizada")
        .count()
    )
    presentes = (
        db.query(Presenca)
        .join(Aula, Presenca.aula_id == Aula.id)
        .filter(Aula.professor_id == pessoa_id, Aula.status == "realizada", Presenca.presente == True)
        .count()
    )
    presenca_media = (presentes / total_presencas) if total_presencas > 0 else None

    # Pagamentos
    pagamentos = pagamento_repo.listar_professores(db, professor_id=pessoa_id)
    custo_total_pago = sum(p.valor_total for p in pagamentos)

    # Custo estimado mês atual
    if professor.tipo_contrato == "clt":
        custo_mes_atual = professor.salario
    else:
        custo_mes_atual = (
            Decimal(str(realizadas_mes)) * professor.valor_por_aula
            if professor.valor_por_aula else None
        )

    # Histórico mensal — últimos 6 meses completos (exclui mês atual)
    historico_mensal = []
    for i in range(6, 0, -1):
        # mês i atrás
        ano = hoje.year
        mes = hoje.month - i
        while mes <= 0:
            mes += 12
            ano -= 1
        primeiro = date(ano, mes, 1)
        ultimo = date(ano, mes, monthrange(ano, mes)[1])
        label = f"{mes:02d}/{ano}"

        real = (
            db.query(Aula)
            .filter(Aula.professor_id == pessoa_id, Aula.status == "realizada",
                    Aula.data >= primeiro, Aula.data <= ultimo)
            .count()
        )
        canc = (
            db.query(Aula)
            .filter(Aula.professor_id == pessoa_id, Aula.status == "cancelada",
                    Aula.data >= primeiro, Aula.data <= ultimo)
            .count()
        )
        total_p = (
            db.query(Presenca)
            .join(Aula, Presenca.aula_id == Aula.id)
            .filter(Aula.professor_id == pessoa_id, Aula.status == "realizada",
                    Aula.data >= primeiro, Aula.data <= ultimo)
            .count()
        )
        pres_p = (
            db.query(Presenca)
            .join(Aula, Presenca.aula_id == Aula.id)
            .filter(Aula.professor_id == pessoa_id, Aula.status == "realizada",
                    Aula.data >= primeiro, Aula.data <= ultimo,
                    Presenca.presente == True)
            .count()
        )
        historico_mensal.append(MesHistorico(
            mes=label,
            realizadas=real,
            canceladas=canc,
            presenca_media=(pres_p / total_p) if total_p > 0 else None,
        ))

    return ProfessorDashboardOut(
        professor_id=professor.pessoa_id,
        nome=professor.pessoa.nome,
        cpf=professor.pessoa.cpf,
        tipo_contrato=professor.tipo_contrato,
        salario=professor.salario,
        valor_por_aula=professor.valor_por_aula,
        ativo=professor.ativo,
        turmas=turmas_data,
        aulas={
            "total": total,
            "realizadas": realizadas,
            "canceladas": canceladas,
            "agendadas": agendadas,
            "mes_atual": {
                "realizadas": realizadas_mes,
                "agendadas": agendadas_mes,
                "canceladas": canceladas_mes,
                "presenca_media": presenca_media_mes,
            },
        },
        presenca_media=presenca_media,
        custo_total_pago=custo_total_pago if custo_total_pago else Decimal("0"),
        custo_mes_atual=custo_mes_atual,
        historico_pagamentos=pagamentos[:6],
        historico_mensal=historico_mensal,
    )
