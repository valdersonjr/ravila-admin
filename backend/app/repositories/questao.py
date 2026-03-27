import random
from datetime import date
from typing import Optional

from sqlalchemy.orm import Session

from app.models.questao import Questao, QuestaoAlunoDia, QuestaoResposta
from app.schemas.questao import QuestaoCreate, QuestaoUpdate


# ── Admin CRUD ────────────────────────────────────────────────────────────────

def listar(
    db: Session,
    *,
    nivel: Optional[str] = None,
    subtipo: Optional[str] = None,
    estilo: Optional[str] = None,
    ativo: Optional[bool] = True,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[Questao], int]:
    q = db.query(Questao)
    if nivel:
        q = q.filter(Questao.nivel == nivel)
    if subtipo:
        q = q.filter(Questao.subtipo == subtipo)
    if estilo:
        q = q.filter(Questao.estilo == estilo)
    if ativo is not None:
        q = q.filter(Questao.ativo == ativo)
    q = q.order_by(Questao.criado_em.desc())
    total = q.count()
    return q.offset(skip).limit(limit).all(), total


def buscar(db: Session, questao_id: int) -> Optional[Questao]:
    return db.query(Questao).filter(Questao.id == questao_id).first()


def criar(db: Session, dados: QuestaoCreate) -> Questao:
    questao = Questao(**dados.model_dump())
    db.add(questao)
    db.commit()
    db.refresh(questao)
    return questao


def atualizar(db: Session, questao: Questao, dados: QuestaoUpdate) -> Questao:
    for field, value in dados.model_dump(exclude_unset=True).items():
        setattr(questao, field, value)
    db.commit()
    db.refresh(questao)
    return questao


def deletar(db: Session, questao: Questao) -> None:
    questao.ativo = False
    db.commit()


# ── Questão diária ────────────────────────────────────────────────────────────

def buscar_diaria_hoje(db: Session, aluno_id: int, hoje: date) -> Optional[QuestaoAlunoDia]:
    return (
        db.query(QuestaoAlunoDia)
        .filter(QuestaoAlunoDia.aluno_id == aluno_id, QuestaoAlunoDia.data == hoje)
        .first()
    )


def sortear_questao_para_aluno(db: Session, aluno_id: int, nivel: str, hoje: date) -> Optional[Questao]:
    """Seleciona aleatoriamente uma questão do nível do aluno que ainda não foi respondida."""
    ja_respondidas = (
        db.query(QuestaoResposta.questao_id)
        .filter(QuestaoResposta.aluno_id == aluno_id, QuestaoResposta.origem == "diaria")
        .subquery()
    )
    candidatas = (
        db.query(Questao)
        .filter(
            Questao.nivel == nivel,
            Questao.ativo == True,
            Questao.id.not_in(ja_respondidas),
        )
        .all()
    )
    if not candidatas:
        # Todas já foram respondidas — reusa qualquer ativa do nível
        candidatas = db.query(Questao).filter(Questao.nivel == nivel, Questao.ativo == True).all()
    if not candidatas:
        return None
    return random.choice(candidatas)


def criar_diaria(db: Session, aluno_id: int, questao_id: int, hoje: date) -> QuestaoAlunoDia:
    diaria = QuestaoAlunoDia(aluno_id=aluno_id, questao_id=questao_id, data=hoje)
    db.add(diaria)
    db.commit()
    db.refresh(diaria)
    return diaria


def marcar_diaria_respondida(db: Session, diaria: QuestaoAlunoDia) -> None:
    from datetime import datetime
    diaria.respondida = True
    diaria.respondida_em = datetime.utcnow()
    db.commit()


# ── Respostas ─────────────────────────────────────────────────────────────────

def registrar_resposta(
    db: Session,
    aluno_id: int,
    questao_id: int,
    resposta_dada: str,
    acertou: bool,
    origem: str,
) -> QuestaoResposta:
    resp = QuestaoResposta(
        aluno_id=aluno_id,
        questao_id=questao_id,
        resposta_dada=resposta_dada,
        acertou=acertou,
        origem=origem,
    )
    db.add(resp)
    db.commit()
    return resp


# ── Banco livre ───────────────────────────────────────────────────────────────

def listar_para_portal(
    db: Session,
    *,
    nivel: Optional[str] = None,
    estilo: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
) -> list[Questao]:
    q = db.query(Questao).filter(Questao.ativo == True)
    if nivel:
        q = q.filter(Questao.nivel == nivel)
    if estilo:
        q = q.filter(Questao.estilo == estilo)
    return q.order_by(Questao.id).offset(skip).limit(limit).all()


# ── Streak ────────────────────────────────────────────────────────────────────

def calcular_streak(db: Session, aluno_id: int) -> int:
    from datetime import timedelta
    hoje = date.today()

    dias_respondidos: set[date] = set(
        row[0]
        for row in db.query(QuestaoAlunoDia.data)
        .filter(QuestaoAlunoDia.aluno_id == aluno_id, QuestaoAlunoDia.respondida == True)
        .all()
    )

    if not dias_respondidos:
        return 0

    streak = 0
    dia = hoje if hoje in dias_respondidos else hoje - timedelta(days=1)

    while dia in dias_respondidos:
        streak += 1
        dia -= timedelta(days=1)

    return streak
