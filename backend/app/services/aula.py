import logging
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.constants import AulaStatus, AulaTipo
from app.models.aula import Aula
from app.models.pessoa import Pessoa
from app.models.reposicao import ReposicaoPendente
from app.repositories import aula as aula_repo
from app.repositories import professor as professor_repo
from app.repositories import turma as turma_repo
from app.schemas.aula import AulaCreate, AulaAvulsaCreate, AulaListOut

logger = logging.getLogger(__name__)


def listar(
    db: Session,
    turma_id: int | None = None,
    professor_id: int | None = None,
    data_inicio: date | None = None,
    data_fim: date | None = None,
    status_filter: str | None = None,
    aluno_id: int | None = None,
    page: int = 1,
    page_size: int = 10,
) -> AulaListOut:
    items, total = aula_repo.listar(db, turma_id, professor_id, data_inicio, data_fim, status_filter, aluno_id, page, page_size)
    return AulaListOut(items=items, total=total, page=page, page_size=page_size)


def buscar(db: Session, id: int) -> Aula:
    aula = aula_repo.buscar_por_id(db, id)
    if not aula:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aula não encontrada",
        )
    return aula


def criar(db: Session, dados: AulaCreate, pendente_aprovacao: bool = False) -> Aula:
    turma = turma_repo.buscar_por_id(db, dados.turma_id)
    if not turma:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Turma não encontrada")
    professor = professor_repo.buscar_por_pessoa_id(db, dados.professor_id)
    if not professor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professor não encontrado")
    if aula_repo.professor_tem_aula_no_dia(db, dados.professor_id, dados.data):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Professor já possui uma aula agendada neste dia.",
        )
    professor_nome = professor.pessoa.nome if professor.pessoa else ""
    payload = {
        "turma_id": dados.turma_id,
        "data": dados.data,
        "hora_inicio": dados.hora_inicio,
        "hora_fim": dados.hora_fim,
        "professor_id": dados.professor_id,
        "professor_nome_snapshot": professor_nome,
        "tipo": dados.tipo,
        "status": AulaStatus.PENDENTE_APROVACAO if pendente_aprovacao else AulaStatus.AGENDADA,
    }
    return aula_repo.criar(db, payload)


def criar_avulsa(db: Session, dados: AulaAvulsaCreate) -> Aula:
    """Cria uma aula particular/avulsa sem vínculo com turma."""
    aluno = db.query(Pessoa).filter(Pessoa.id == dados.aluno_id).first()
    if not aluno:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aluno não encontrado")
    professor = professor_repo.buscar_por_pessoa_id(db, dados.professor_id)
    if not professor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professor não encontrado")

    conflito = aula_repo.buscar_conflito_horario(
        db, dados.professor_id, dados.data, dados.hora_inicio, dados.hora_fim
    )
    if conflito:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Professor já possui aula agendada das {conflito.hora_inicio}–{conflito.hora_fim} neste dia.",
        )

    logger.info(
        "aula.avulsa.criar professor_id=%s aluno_id=%s data=%s",
        dados.professor_id, dados.aluno_id, dados.data,
    )
    return aula_repo.criar(db, {
        "aluno_id": dados.aluno_id,
        "aluno_nome_snapshot": aluno.nome,
        "professor_id": dados.professor_id,
        "professor_nome_snapshot": professor.pessoa.nome if professor.pessoa else "",
        "data": dados.data,
        "hora_inicio": dados.hora_inicio,
        "hora_fim": dados.hora_fim,
        "tipo": AulaTipo.REGULAR,
        "status": AulaStatus.AGENDADA,
        "descricao": dados.descricao,
    })


def atualizar_status(db: Session, aula_id: int, novo_status: str) -> Aula:
    aula = buscar(db, aula_id)
    return aula_repo.atualizar(db, aula, {"status": novo_status})


def aprovar(db: Session, aula_id: int) -> Aula:
    aula = buscar(db, aula_id)
    if aula.status != AulaStatus.PENDENTE_APROVACAO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aula não está pendente de aprovação",
        )
    return aula_repo.atualizar(db, aula, {"status": AulaStatus.AGENDADA})


def substituir_professor(db: Session, aula_id: int, professor_id: int) -> Aula:
    aula = buscar(db, aula_id)
    professor = professor_repo.buscar_por_pessoa_id(db, professor_id)
    if not professor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professor não encontrado")
    if aula_repo.professor_tem_aula_no_dia(db, professor_id, aula.data, exclude_id=aula_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Professor já possui uma aula agendada neste dia.",
        )
    return aula_repo.atualizar(db, aula, {
        "professor_id": professor_id,
        "professor_nome_snapshot": professor.pessoa.nome if professor.pessoa else "",
    })


def atualizar_descricao(db: Session, aula_id: int, descricao: str | None) -> Aula:
    aula = buscar(db, aula_id)
    return aula_repo.atualizar(db, aula, {"descricao": descricao})


def deletar(db: Session, aula_id: int) -> None:
    aula = buscar(db, aula_id)
    if aula.status != AulaStatus.AGENDADA:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apenas aulas com status 'agendada' podem ser excluídas",
        )
    # Se esta aula estava sendo usada como reposição, volta o crédito para pendente
    rep = db.query(ReposicaoPendente).filter(ReposicaoPendente.aula_reposicao_id == aula_id).first()
    if rep:
        rep.aula_reposicao_id = None
        rep.status = "pendente"
    aula_repo.deletar(db, aula)


def remarcar(
    db: Session,
    aula_id: int,
    nova_data: date,
    hora_inicio: str,
    hora_fim: str,
) -> Aula:
    aula_origem = buscar(db, aula_id)
    aula_repo.atualizar(db, aula_origem, {"status": AulaStatus.CANCELADA})
    nova_aula = aula_repo.criar(db, {
        # Preserva o vínculo com turma OU com aluno (avulsa)
        "turma_id": aula_origem.turma_id,
        "aluno_id": aula_origem.aluno_id,
        "aluno_nome_snapshot": aula_origem.aluno_nome_snapshot,
        "data": nova_data,
        "hora_inicio": hora_inicio,
        "hora_fim": hora_fim,
        "professor_id": aula_origem.professor_id,
        "professor_nome_snapshot": aula_origem.professor_nome_snapshot,
        "tipo": AulaTipo.SUBSTITUTIVA,
        "status": AulaStatus.AGENDADA,
        "aula_origem_id": aula_origem.id,
    })
    return nova_aula
