from datetime import date, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.constants import AulaStatus, AulaTipo
from app.models.turma import Turma, HorarioTurma
from app.repositories import turma as turma_repo
from app.repositories import professor as professor_repo
from app.repositories import aula as aula_repo
from app.repositories import matricula as matricula_repo
from app.schemas.turma import TurmaCreate, TurmaUpdate, HorarioTurmaCreate, GerarSemanaItem, GerarSemanaRelatorio


def listar(
    db: Session,
    professor_id: int | None = None,
    status: str | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 10,
):
    from app.schemas.turma import TurmaListOut
    items, total = turma_repo.listar(db, professor_id, status, search, page, page_size)
    return TurmaListOut(items=items, total=total, page=page, page_size=page_size)


def buscar(db: Session, id: int) -> Turma:
    turma = turma_repo.buscar_por_id(db, id)
    if not turma:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turma não encontrada",
        )
    return turma


def criar(db: Session, dados: TurmaCreate) -> Turma:
    professor = professor_repo.buscar_por_pessoa_id(db, dados.professor_id)
    if not professor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professor não encontrado",
        )
    return turma_repo.criar(db, dados.model_dump())


def atualizar(db: Session, id: int, dados: TurmaUpdate) -> Turma:
    turma = buscar(db, id)
    data = dados.model_dump(exclude_unset=True)
    if "professor_id" in data:
        professor = professor_repo.buscar_por_pessoa_id(db, data["professor_id"])
        if not professor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Professor não encontrado",
            )
    return turma_repo.atualizar(db, turma, data)


def excluir(db: Session, turma_id: int) -> None:
    turma = buscar(db, turma_id)
    matricula_repo.cancelar_por_turma(db, turma_id)
    turma_repo.atualizar(db, turma, {"status": "excluida"})


def adicionar_horario(db: Session, turma_id: int, dados: HorarioTurmaCreate) -> HorarioTurma:
    turma = buscar(db, turma_id)
    payload = {"turma_id": turma.id, **dados.model_dump()}
    return turma_repo.criar_horario(db, payload)


def remover_horario(db: Session, turma_id: int, horario_id: int) -> None:
    horario = turma_repo.buscar_horario(db, horario_id)
    if not horario or horario.turma_id != turma_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Horário não encontrado",
        )
    turma_repo.deletar_horario(db, horario)


def gerar_aulas(
    db: Session,
    turma_id: int,
    data_inicio: date,
    data_fim: date,
) -> int:
    turma = turma_repo.buscar_por_id(db, turma_id)
    if not turma:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turma não encontrada",
        )

    if data_fim < data_inicio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="data_fim deve ser maior ou igual a data_inicio",
        )

    horarios = turma.horarios
    if not horarios:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Turma não possui horários configurados",
        )

    professor_nome = turma.professor.pessoa.nome if turma.professor and turma.professor.pessoa else ""

    # Uma única query retorna todas as datas já ocupadas no período
    existing_dates = aula_repo.buscar_datas_existentes(db, turma_id, data_inicio, data_fim)

    # Indexa horários por dia da semana para lookup O(1)
    dia_map: dict[int, list] = {}
    for h in horarios:
        dia_map.setdefault(h.dia_semana, []).append(h)

    aulas_criadas = 0
    current = data_inicio
    while current <= data_fim:
        dia = (current.weekday() + 1) % 7  # converte para 0=Dom, 1=Seg, ..., 6=Sáb
        if dia in dia_map and current not in existing_dates:
            for h in dia_map[dia]:
                aula_repo.criar(db, {
                    "turma_id": turma_id,
                    "data": current,
                    "hora_inicio": h.hora_inicio,
                    "hora_fim": h.hora_fim,
                    "professor_id": turma.professor_id,
                    "professor_nome_snapshot": professor_nome,
                    "tipo": AulaTipo.REGULAR,
                    "status": AulaStatus.AGENDADA,
                })
                aulas_criadas += 1
            existing_dates.add(current)
        current += timedelta(days=1)

    return aulas_criadas


def gerar_semana(db: Session, dry_run: bool = True, professor_id: int | None = None) -> GerarSemanaRelatorio:
    today = date.today()
    weekday = today.weekday()  # 0=segunda, 6=domingo
    if weekday < 5:
        # Dia útil → semana atual
        data_inicio = today - timedelta(days=weekday)
    else:
        # Fim de semana → semana seguinte
        data_inicio = today + timedelta(days=7 - weekday)
    data_fim = data_inicio + timedelta(days=6)

    turmas = turma_repo.listar_todos(db, professor_id=professor_id, status="ativa")

    itens: list[GerarSemanaItem] = []
    total_aulas = 0

    # Fase 1: sempre calcular o relatório completo (sem criar nada)
    for turma in turmas:
        professor_nome = turma.professor.pessoa.nome if turma.professor and turma.professor.pessoa else ""

        if not turma.horarios:
            itens.append(GerarSemanaItem(
                turma_id=turma.id,
                turma_nome=turma.nome,
                professor_nome=professor_nome,
                aulas_a_criar=0,
                sem_horario=True,
                conflitos=[],
            ))
            continue

        existing_dates = aula_repo.buscar_datas_existentes(db, turma.id, data_inicio, data_fim)

        dia_map: dict[int, list] = {}
        for h in turma.horarios:
            dia_map.setdefault(h.dia_semana, []).append(h)

        aulas_a_criar = 0
        conflitos: list[str] = []

        current = data_inicio
        while current <= data_fim:
            dia = (current.weekday() + 1) % 7  # converte para 0=Dom, 1=Seg, ..., 6=Sáb
            if dia in dia_map and current not in existing_dates:
                for h in dia_map[dia]:
                    conflito = aula_repo.buscar_conflito_horario(
                        db, turma.professor_id, current, h.hora_inicio, h.hora_fim
                    )
                    if conflito:
                        conflito_turma = f"turma {conflito.turma_id}" if conflito.turma_id else "aula particular"
                        conflitos.append(
                            f"{current.strftime('%d/%m')} {h.hora_inicio[:5]}–{h.hora_fim[:5]} (conflito com {conflito_turma})"
                        )
                    else:
                        aulas_a_criar += 1
            current += timedelta(days=1)

        total_aulas += aulas_a_criar
        itens.append(GerarSemanaItem(
            turma_id=turma.id,
            turma_nome=turma.nome,
            professor_nome=professor_nome,
            aulas_a_criar=aulas_a_criar,
            sem_horario=False,
            conflitos=conflitos,
        ))

    # Fase 2: só criar aulas se não houver nenhum conflito e não for dry_run
    total_conflitos = sum(len(i.conflitos) for i in itens)
    if not dry_run and total_conflitos == 0:
        for turma in turmas:
            professor_nome = turma.professor.pessoa.nome if turma.professor and turma.professor.pessoa else ""
            if not turma.horarios:
                continue

            existing_dates = aula_repo.buscar_datas_existentes(db, turma.id, data_inicio, data_fim)
            dia_map: dict[int, list] = {}
            for h in turma.horarios:
                dia_map.setdefault(h.dia_semana, []).append(h)

            current = data_inicio
            while current <= data_fim:
                dia = (current.weekday() + 1) % 7  # converte para 0=Dom, 1=Seg, ..., 6=Sáb
                if dia in dia_map and current not in existing_dates:
                    for h in dia_map[dia]:
                        aula_repo.criar(db, {
                            "turma_id": turma.id,
                            "data": current,
                            "hora_inicio": h.hora_inicio,
                            "hora_fim": h.hora_fim,
                            "professor_id": turma.professor_id,
                            "professor_nome_snapshot": professor_nome,
                            "tipo": AulaTipo.REGULAR,
                            "status": AulaStatus.AGENDADA,
                        })
                current += timedelta(days=1)

    return GerarSemanaRelatorio(
        data_inicio=data_inicio.isoformat(),
        data_fim=data_fim.isoformat(),
        itens=itens,
        total_aulas=total_aulas,
    )
