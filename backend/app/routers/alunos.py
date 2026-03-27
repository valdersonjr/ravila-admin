from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_staff, get_current_user
from app.models.aluno import Aluno
from app.models.matricula import Matricula
from app.models.pessoa import Pessoa
from app.models.questao import Questao, QuestaoResposta, NIVEIS_CEFR
from app.models.turma import Turma
from app.models.user import User
from app.schemas.aluno import AlunoCreate, AlunoUpdate, AlunoOut, AlunoListOut
from app.schemas.presenca import PresencaDoAlunoOut
from app.services import aluno as aluno_service
from app.repositories import presenca as presenca_repo

router = APIRouter(prefix="/alunos", tags=["alunos"])


@router.get("/", response_model=AlunoListOut)
def listar(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    nivel_id: Optional[int] = Query(None),
    sem_contrato_ativo: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    return aluno_service.listar(db, status_filter, search, nivel_id, sem_contrato_ativo, page, page_size)


@router.post("/", response_model=AlunoOut, status_code=status.HTTP_201_CREATED)
def criar(
    body: AlunoCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    return aluno_service.criar(db, body)


@router.get("/aniversarios", response_model=list[AlunoOut])
def aniversarios(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    professor_id = current_user.pessoa_id if current_user.role == "professor" else None
    return aluno_service.aniversarios_semanas(db, professor_id)


# ── Nível de inglês ───────────────────────────────────────────────────────────

class NivelInglesOut(BaseModel):
    pessoa_id: int
    nome: str
    nivel_atual: Optional[str]
    avaliado_em: Optional[datetime]
    total_respondidas: int
    acertos: int
    percentual: int


class AtualizarNivelIn(BaseModel):
    nivel: str


@router.get("/nivel-ingles", response_model=list[NivelInglesOut])
def listar_nivel_ingles(
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    alunos = (
        db.query(Aluno)
        .join(Pessoa, Pessoa.id == Aluno.pessoa_id)
        .order_by(Pessoa.nome.asc())
        .all()
    )

    resultado = []
    for aluno in alunos:
        nivel_atual = aluno.nivel_questao

        respostas = (
            db.query(QuestaoResposta)
            .join(Questao, QuestaoResposta.questao_id == Questao.id)
            .filter(
                QuestaoResposta.aluno_id == aluno.pessoa_id,
                QuestaoResposta.origem == "banco",
                Questao.nivel == nivel_atual,
            )
            .order_by(QuestaoResposta.respondida_em.desc())
            .limit(20)
            .all()
        ) if nivel_atual else []

        vistas: set[int] = set()
        peso_total = 0.0
        acertos_pond = 0.0
        for r in respostas:
            peso = 1.0 if r.questao_id not in vistas else 0.25
            vistas.add(r.questao_id)
            peso_total += peso
            if r.acertou:
                acertos_pond += peso

        total = len(respostas)
        acertos = sum(1 for r in respostas if r.acertou)
        percentual = round(acertos_pond / peso_total * 100) if peso_total > 0 else 0

        resultado.append(NivelInglesOut(
            pessoa_id=aluno.pessoa_id,
            nome=aluno.pessoa.nome,
            nivel_atual=nivel_atual,
            avaliado_em=aluno.nivel_questao_avaliado_em,
            total_respondidas=total,
            acertos=acertos,
            percentual=percentual,
        ))

    return resultado


@router.get("/{pessoa_id}", response_model=AlunoOut)
def buscar(
    pessoa_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "professor":
        tem_acesso = (
            db.query(Matricula)
            .join(Turma, Turma.id == Matricula.turma_id)
            .filter(Matricula.aluno_id == pessoa_id, Turma.professor_id == current_user.pessoa_id)
            .first()
        )
        if not tem_acesso:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    return aluno_service.buscar(db, pessoa_id)


@router.get("/{pessoa_id}/presencas", response_model=dict)
def presencas_do_aluno(
    pessoa_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    items, total = presenca_repo.listar_por_aluno(db, pessoa_id, page, page_size)
    return {
        "items": [PresencaDoAlunoOut.model_validate(p) for p in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.put("/{pessoa_id}", response_model=AlunoOut)
def atualizar(
    pessoa_id: int,
    body: AlunoUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    return aluno_service.atualizar(db, pessoa_id, body)


@router.patch("/{pessoa_id}/nivel-ingles")
def atualizar_nivel_ingles(
    pessoa_id: int,
    body: AtualizarNivelIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    if body.nivel not in NIVEIS_CEFR:
        raise HTTPException(status_code=422, detail=f"Nível inválido. Use: {NIVEIS_CEFR}")
    aluno = db.query(Aluno).filter(Aluno.pessoa_id == pessoa_id).first()
    if not aluno:
        raise HTTPException(status_code=404)
    aluno.nivel_questao = body.nivel
    aluno.nivel_questao_avaliado_em = datetime.utcnow()
    db.commit()
    return {"nivel_questao": body.nivel}


@router.post("/{pessoa_id}/nivel-ingles/liberar-reavaliacao")
def liberar_reavaliacao(
    pessoa_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    aluno = db.query(Aluno).filter(Aluno.pessoa_id == pessoa_id).first()
    if not aluno:
        raise HTTPException(status_code=404)
    aluno.nivel_questao_avaliado_em = None
    db.commit()
    return {"ok": True}
