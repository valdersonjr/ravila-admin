from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_staff, require_staff_or_professor, get_current_user
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


class NivelInglesListOut(BaseModel):
    items: list[NivelInglesOut]
    total: int
    page: int
    page_size: int


class NivelInglesStats(BaseModel):
    total: int
    sem_nivel: int
    pronto_para_avancar: int
    com_dificuldade: int


PESO_NOVA_RESPOSTA = 1.0
PESO_RESPOSTA_REPETIDA = 0.25
HISTORICO_RESPOSTAS_LIMITE = 20
PERCENTUAL_PRONTO_PARA_AVANCAR = 75
PERCENTUAL_COM_DIFICULDADE = 40
MIN_RESPOSTAS_PARA_AVALIACAO = 10


def calcular_stats_ponderadas(respostas: list[tuple[int, bool]]) -> tuple[int, int, int]:
    vistas: set[int] = set()
    peso_total = 0.0
    acertos_ponderados = 0.0
    for questao_id, acertou in respostas:
        peso = PESO_NOVA_RESPOSTA if questao_id not in vistas else PESO_RESPOSTA_REPETIDA
        vistas.add(questao_id)
        peso_total += peso
        if acertou:
            acertos_ponderados += peso
    total = len(respostas)
    acertos = sum(1 for _, acertou in respostas if acertou)
    percentual = round(acertos_ponderados / peso_total * 100) if peso_total > 0 else 0
    return total, acertos, percentual


def buscar_respostas_recentes_por_aluno(db: Session, aluno_ids: list[int]) -> dict[int, list[tuple[int, bool]]]:
    if not aluno_ids:
        return {}
    rows = db.execute(text("""
        SELECT r.aluno_id, r.questao_id, r.acertou
        FROM questao_respostas r
        JOIN questoes q ON q.id = r.questao_id
        JOIN alunos a ON a.pessoa_id = r.aluno_id
        WHERE r.origem = 'banco'
          AND q.nivel = a.nivel_questao
          AND r.aluno_id = ANY(:ids)
          AND r.id IN (
              SELECT id FROM questao_respostas r2
              WHERE r2.aluno_id = r.aluno_id AND r2.origem = 'banco'
              ORDER BY r2.respondida_em DESC
              LIMIT :limite
          )
    """), {"ids": aluno_ids, "limite": HISTORICO_RESPOSTAS_LIMITE}).fetchall()
    resultado: dict[int, list[tuple[int, bool]]] = {}
    for row in rows:
        resultado.setdefault(row.aluno_id, []).append((row.questao_id, row.acertou))
    return resultado


@router.get("/nivel-ingles/stats", response_model=NivelInglesStats)
def stats_nivel_ingles(
    db: Session = Depends(get_db),
    _: User = Depends(require_staff_or_professor),
):
    todos = db.query(Aluno).join(Pessoa, Pessoa.id == Aluno.pessoa_id).all()
    total = len(todos)
    sem_nivel = sum(1 for a in todos if not a.nivel_questao)

    ids = [a.pessoa_id for a in todos if a.nivel_questao]
    respostas_map = buscar_respostas_recentes_por_aluno(db, ids)

    pronto = 0
    dificuldade = 0
    for aluno in todos:
        if not aluno.nivel_questao:
            continue
        t, _, pct = calcular_stats_ponderadas(respostas_map.get(aluno.pessoa_id, []))
        if t >= 10 and pct >= 75:
            pronto += 1
        elif t >= 10 and pct < 40:
            dificuldade += 1

    return NivelInglesStats(total=total, sem_nivel=sem_nivel, pronto_para_avancar=pronto, com_dificuldade=dificuldade)


@router.get("/nivel-ingles", response_model=NivelInglesListOut)
def listar_nivel_ingles(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    nivel: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_staff_or_professor),
):
    query = db.query(Aluno).join(Pessoa, Pessoa.id == Aluno.pessoa_id)
    if search:
        query = query.filter(Pessoa.nome.ilike(f"%{search}%"))
    if nivel == "sem_nivel":
        query = query.filter(Aluno.nivel_questao == None)
    elif nivel:
        query = query.filter(Aluno.nivel_questao == nivel)

    total = query.count()
    alunos = query.order_by(Pessoa.nome.asc()).offset((page - 1) * page_size).limit(page_size).all()

    if not alunos:
        return NivelInglesListOut(items=[], total=total, page=page, page_size=page_size)

    respostas_map = buscar_respostas_recentes_por_aluno(db, [a.pessoa_id for a in alunos])

    resultado = []
    for aluno in alunos:
        total_r, acertos, percentual = calcular_stats_ponderadas(respostas_map.get(aluno.pessoa_id, []))
        resultado.append(NivelInglesOut(
            pessoa_id=aluno.pessoa_id,
            nome=aluno.pessoa.nome,
            nivel_atual=aluno.nivel_questao,
            avaliado_em=aluno.nivel_questao_avaliado_em,
            total_respondidas=total_r,
            acertos=acertos,
            percentual=percentual,
        ))

    return NivelInglesListOut(items=resultado, total=total, page=page, page_size=page_size)


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


@router.patch("/{pessoa_id}/nivel-ingles", response_model=AlunoOut)
def atualizar_nivel_ingles(
    pessoa_id: int,
    body: AtualizarNivelIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff_or_professor),
):
    if body.nivel not in NIVEIS_CEFR:
        raise HTTPException(status_code=422, detail=f"Nível inválido. Use: {NIVEIS_CEFR}")
    aluno = db.query(Aluno).filter(Aluno.pessoa_id == pessoa_id).first()
    if not aluno:
        raise HTTPException(status_code=404)
    aluno.nivel_questao = body.nivel
    aluno.nivel_questao_avaliado_em = datetime.utcnow()
    db.commit()
    db.refresh(aluno)
    return aluno_service.buscar(db, pessoa_id)


@router.post("/{pessoa_id}/nivel-ingles/liberar-reavaliacao")
def liberar_reavaliacao(
    pessoa_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff_or_professor),
):
    aluno = db.query(Aluno).filter(Aluno.pessoa_id == pessoa_id).first()
    if not aluno:
        raise HTTPException(status_code=404)
    aluno.nivel_questao_avaliado_em = None
    db.commit()
    return {"ok": True}
