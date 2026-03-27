from datetime import date
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.questao import Questao
from app.repositories import questao as repo
from app.schemas.questao import QuestaoCreate, QuestaoUpdate, QuestaoRespostaOut


# ── Helpers ───────────────────────────────────────────────────────────────────

def verificar_resposta(questao: Questao, resposta_dada: str) -> bool:
    if questao.subtipo == "multiple_choice":
        return resposta_dada.strip() == questao.resposta_correta.strip()
    elif questao.subtipo == "fill_blanks":
        resp_norm = resposta_dada.lower().strip()
        aceitas = [r.lower().strip() for r in questao.resposta_correta.split("|")]
        return resp_norm in aceitas
    return False


def _get_or_404(db: Session, questao_id: int) -> Questao:
    q = repo.buscar(db, questao_id)
    if not q:
        raise HTTPException(status_code=404, detail="Questão não encontrada")
    return q


# ── Admin ─────────────────────────────────────────────────────────────────────

def listar(db: Session, **kwargs):
    items, total = repo.listar(db, **kwargs)
    return items, total


def criar(db: Session, dados: QuestaoCreate) -> Questao:
    if dados.subtipo == "multiple_choice" and not dados.alternativas:
        raise HTTPException(status_code=422, detail="multiple_choice requer alternativas")
    return repo.criar(db, dados)


def atualizar(db: Session, questao_id: int, dados: QuestaoUpdate) -> Questao:
    q = _get_or_404(db, questao_id)
    return repo.atualizar(db, q, dados)


def deletar(db: Session, questao_id: int) -> None:
    q = _get_or_404(db, questao_id)
    repo.deletar(db, q)


# ── Portal: questão diária ────────────────────────────────────────────────────

def obter_questao_diaria(db: Session, aluno_id: int, nivel_questao: Optional[str]):
    if not nivel_questao:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="nivel_nao_configurado",
        )

    hoje = date.today()
    diaria = repo.buscar_diaria_hoje(db, aluno_id, hoje)

    if not diaria:
        questao = repo.sortear_questao_para_aluno(db, aluno_id, nivel_questao, hoje)
        if not questao:
            raise HTTPException(
                status_code=404,
                detail="Nenhuma questão disponível para este nível",
            )
        diaria = repo.criar_diaria(db, aluno_id, questao.id, hoje)

    return diaria


def responder_questao_diaria(
    db: Session,
    aluno_id: int,
    nivel_questao: Optional[str],
    resposta_dada: str,
) -> QuestaoRespostaOut:
    if not nivel_questao:
        raise HTTPException(status_code=400, detail="nivel_nao_configurado")

    hoje = date.today()
    diaria = repo.buscar_diaria_hoje(db, aluno_id, hoje)

    if not diaria:
        raise HTTPException(status_code=404, detail="Questão do dia não encontrada")
    if diaria.respondida:
        raise HTTPException(status_code=409, detail="Questão do dia já respondida")

    acertou = verificar_resposta(diaria.questao, resposta_dada)

    repo.registrar_resposta(db, aluno_id, diaria.questao_id, resposta_dada, acertou, "diaria")
    repo.marcar_diaria_respondida(db, diaria)

    streak = repo.calcular_streak(db, aluno_id)

    return QuestaoRespostaOut(
        acertou=acertou,
        resposta_correta=diaria.questao.resposta_correta,
        explicacao=diaria.questao.explicacao,
        streak=streak,
    )


# ── Portal: banco livre ───────────────────────────────────────────────────────

def responder_banco(
    db: Session,
    aluno_id: int,
    questao_id: int,
    resposta_dada: str,
) -> QuestaoRespostaOut:
    questao = _get_or_404(db, questao_id)
    acertou = verificar_resposta(questao, resposta_dada)
    repo.registrar_resposta(db, aluno_id, questao_id, resposta_dada, acertou, "banco")
    streak = repo.calcular_streak(db, aluno_id)
    return QuestaoRespostaOut(
        acertou=acertou,
        resposta_correta=questao.resposta_correta,
        explicacao=questao.explicacao,
        streak=streak,
    )
