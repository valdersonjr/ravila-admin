"""
Portal do aluno — endpoints exclusivos para usuários com role='aluno'.
Retorna apenas dados do próprio aluno autenticado.
"""
import random
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.limiter import limiter
from app.database import get_db
from app.dependencies import require_aluno
from app.models.aluno import Aluno
from app.models.aula import Aula
from app.models.contrato import Contrato
from app.models.material import Material
from app.models.matricula import Matricula
from app.models.presenca import Presenca
from app.models.user import User
from app.models.aluno import Aluno as AlunoModel
from app.models.questao import Questao, QuestaoAlunoDia, QuestaoResposta
from app.models.questao import NIVEIS_CEFR
from app.schemas.material import MaterialPortalOut
from app.schemas.questao import (
    QuestaoAlunoDiaOut,
    QuestaoPortalOut,
    QuestaoRespostaCreate,
    QuestaoRespostaOut,
)
from app.repositories import questao as questao_repo
from app.services import questao as questao_svc
from app.services.questao import verificar_resposta
from app.services import s3 as s3_service

router = APIRouter(prefix="/portal", tags=["portal"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class AulaPortalOut(BaseModel):
    id: int
    data: date
    hora_inicio: str
    hora_fim: str
    turma_nome: Optional[str]
    professor_nome: str
    status: str
    tipo: str

    model_config = {"from_attributes": True}


class PresencaPortalOut(BaseModel):
    id: int
    aula_id: int
    data: date
    hora_inicio: str
    hora_fim: str
    turma_nome: Optional[str]
    presente: bool


class AulaListPortalOut(BaseModel):
    items: list[AulaPortalOut]
    total: int
    page: int
    page_size: int


class ResumoPortalOut(BaseModel):
    proxima_aula: Optional[AulaPortalOut]
    streak_dias: int
    questao_respondida_hoje: bool
    nivel_atual: Optional[str]


class ContratoPortalOut(BaseModel):
    id: int
    status: str
    tipo: str
    curso: str
    valor_mensalidade: float
    desconto_percentual: Optional[float]
    desconto_valor: Optional[float]
    dia_vencimento: int
    data_inicio: date
    data_fim: date
    tem_assinado: bool


# ── Helpers ───────────────────────────────────────────────────────────────────

def _turma_ids_do_aluno(db: Session, aluno_id: int) -> list[int]:
    rows = db.query(Matricula.turma_id).filter(Matricula.aluno_id == aluno_id).all()
    return [r[0] for r in rows]


def _query_aulas_do_aluno(db: Session, aluno_id: int):
    turma_ids = _turma_ids_do_aluno(db, aluno_id)
    return (
        db.query(Aula)
        .options(joinedload(Aula.turma), joinedload(Aula.professor))
        .filter(
            or_(
                Aula.turma_id.in_(turma_ids) if turma_ids else False,
                Aula.aluno_id == aluno_id,
            )
        )
    )


def _aula_to_out(aula: Aula) -> AulaPortalOut:
    return AulaPortalOut(
        id=aula.id,
        data=aula.data,
        hora_inicio=aula.hora_inicio,
        hora_fim=aula.hora_fim,
        turma_nome=aula.turma.nome if aula.turma else None,
        professor_nome=aula.professor_nome_snapshot,
        status=aula.status,
        tipo=aula.tipo,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/aulas", response_model=AulaListPortalOut)
def listar_aulas(
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_aluno),
):
    query = _query_aulas_do_aluno(db, current_user.pessoa_id)

    if data_inicio:
        query = query.filter(Aula.data >= data_inicio)
    if data_fim:
        query = query.filter(Aula.data <= data_fim)
    if status:
        query = query.filter(Aula.status == status)

    query = query.order_by(Aula.data.asc(), Aula.hora_inicio.asc())

    total = query.count()
    aulas = query.offset((page - 1) * page_size).limit(page_size).all()

    return AulaListPortalOut(
        items=[_aula_to_out(a) for a in aulas],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/presencas", response_model=list[PresencaPortalOut])
def listar_presencas(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_aluno),
):
    presencas = (
        db.query(Presenca)
        .options(joinedload(Presenca.aula).joinedload(Aula.turma))
        .filter(Presenca.aluno_id == current_user.pessoa_id)
        .join(Presenca.aula)
        .order_by(Aula.data.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return [
        PresencaPortalOut(
            id=p.id,
            aula_id=p.aula_id,
            data=p.aula.data,
            hora_inicio=p.aula.hora_inicio,
            hora_fim=p.aula.hora_fim,
            turma_nome=p.aula.turma.nome if p.aula.turma else None,
            presente=p.presente,
        )
        for p in presencas
    ]


@router.get("/contratos", response_model=list[ContratoPortalOut])
def listar_contratos(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_aluno),
):
    contratos = (
        db.query(Contrato)
        .filter(Contrato.alunos.any(Aluno.pessoa_id == current_user.pessoa_id))
        .order_by(Contrato.data_inicio.desc())
        .all()
    )
    return [
        ContratoPortalOut(
            id=c.id,
            status=c.status,
            tipo=c.tipo,
            curso=c.curso,
            valor_mensalidade=float(c.valor_mensalidade),
            desconto_percentual=float(c.desconto_percentual) if c.desconto_percentual else None,
            desconto_valor=float(c.desconto_valor) if c.desconto_valor else None,
            dia_vencimento=c.dia_vencimento,
            data_inicio=c.data_inicio,
            data_fim=c.data_fim,
            tem_assinado=bool(c.contrato_assinado_key),
        )
        for c in contratos
    ]


@router.get("/contratos/{contrato_id}/download")
def download_contrato(
    contrato_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_aluno),
):
    contrato = (
        db.query(Contrato)
        .filter(
            Contrato.id == contrato_id,
            Contrato.alunos.any(Aluno.pessoa_id == current_user.pessoa_id),
        )
        .first()
    )
    if not contrato:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    if not contrato.contrato_assinado_key:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Contrato assinado não disponível")
    url = s3_service.gerar_url_temporaria(contrato.contrato_assinado_key, expires_in=300)
    return {"url": url}


@router.get("/aulas/{aula_id}/materiais", response_model=list[MaterialPortalOut])
def materiais_da_aula(
    aula_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_aluno),
):
    """Materiais vinculados a uma aula específica, visíveis para o aluno."""
    turma_ids = _turma_ids_do_aluno(db, current_user.pessoa_id)
    materiais = (
        db.query(Material)
        .filter(
            Material.aula_id == aula_id,
            or_(
                Material.publico == True,
                Material.turma_id.in_(turma_ids) if turma_ids else False,
                Material.aula_id.in_(
                    db.query(Aula.id).filter(
                        or_(
                            Aula.turma_id.in_(turma_ids) if turma_ids else False,
                            Aula.aluno_id == current_user.pessoa_id,
                        )
                    )
                ),
            ),
        )
        .order_by(Material.criado_em.desc())
        .all()
    )
    return [
        MaterialPortalOut(
            id=m.id,
            titulo=m.titulo,
            descricao=m.descricao,
            tipo=m.tipo,
            categoria=m.categoria,
            aula_id=m.aula_id,
            tem_arquivo=bool(m.s3_key),
        )
        for m in materiais
    ]


@router.get("/biblioteca", response_model=list[MaterialPortalOut])
def biblioteca(
    categoria: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_aluno),
):
    """Materiais avulsos (sem aula vinculada) visíveis para o aluno."""
    turma_ids = _turma_ids_do_aluno(db, current_user.pessoa_id)
    q = db.query(Material).filter(
        Material.aula_id == None,
        or_(
            Material.publico == True,
            Material.turma_id.in_(turma_ids) if turma_ids else False,
        ),
    )
    if categoria:
        q = q.filter(Material.categoria == categoria)
    materiais = q.order_by(Material.criado_em.desc()).all()
    return [
        MaterialPortalOut(
            id=m.id,
            titulo=m.titulo,
            descricao=m.descricao,
            tipo=m.tipo,
            categoria=m.categoria,
            aula_id=m.aula_id,
            tem_arquivo=bool(m.s3_key),
        )
        for m in materiais
    ]


@router.get("/materiais/{material_id}/download")
def download_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_aluno),
):
    """Gera URL temporária para download de material."""
    turma_ids = _turma_ids_do_aluno(db, current_user.pessoa_id)
    m = (
        db.query(Material)
        .filter(
            Material.id == material_id,
            or_(
                Material.publico == True,
                Material.turma_id.in_(turma_ids) if turma_ids else False,
                Material.aula_id.in_(
                    db.query(Aula.id).filter(
                        or_(
                            Aula.turma_id.in_(turma_ids) if turma_ids else False,
                            Aula.aluno_id == current_user.pessoa_id,
                        )
                    )
                ),
            ),
        )
        .first()
    )
    if not m:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Material não encontrado")
    if not m.s3_key:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Arquivo não disponível")
    url = s3_service.gerar_url_temporaria(m.s3_key, expires_in=300)
    return {"url": url}


@router.get("/questao-diaria", response_model=QuestaoAlunoDiaOut)
def questao_diaria(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_aluno),
):
    """Retorna (ou sorteia) a questão do dia do aluno."""
    aluno = db.query(AlunoModel).filter(AlunoModel.pessoa_id == current_user.pessoa_id).first()
    diaria = questao_svc.obter_questao_diaria(db, current_user.pessoa_id, aluno.nivel_questao if aluno else None)
    # Carrega a questão para o relacionamento estar disponível
    db.refresh(diaria)
    return QuestaoAlunoDiaOut(
        data=diaria.data,
        respondida=diaria.respondida,
        questao=QuestaoPortalOut.model_validate(diaria.questao),
    )


@router.post("/questao-diaria/responder", response_model=QuestaoRespostaOut)
@limiter.limit("20/minute")
def responder_questao_diaria(
    request: Request,
    dados: QuestaoRespostaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_aluno),
):
    aluno = db.query(AlunoModel).filter(AlunoModel.pessoa_id == current_user.pessoa_id).first()
    return questao_svc.responder_questao_diaria(
        db,
        current_user.pessoa_id,
        aluno.nivel_questao if aluno else None,
        dados.resposta_dada,
    )


@router.get("/questoes", response_model=list[QuestaoPortalOut])
def banco_questoes(
    nivel: Optional[str] = Query(None),
    estilo: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    _: User = Depends(require_aluno),
):
    """Banco de questões para prática livre."""
    from app.repositories.questao import listar_para_portal
    items = listar_para_portal(
        db, nivel=nivel, estilo=estilo,
        skip=(page - 1) * page_size, limit=page_size,
    )
    return [QuestaoPortalOut.model_validate(q) for q in items]


@router.post("/questoes/{questao_id}/responder", response_model=QuestaoRespostaOut)
@limiter.limit("60/minute")
def responder_banco(
    request: Request,
    questao_id: int,
    dados: QuestaoRespostaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_aluno),
):
    return questao_svc.responder_banco(db, current_user.pessoa_id, questao_id, dados.resposta_dada)


# ── Teste de proficiência ─────────────────────────────────────────────────────

class RespostaLoteItem(BaseModel):
    questao_id: int
    resposta_dada: str

class AvaliarCompletoIn(BaseModel):
    respostas: list[RespostaLoteItem]


@router.get("/teste-proficiencia/status")
def status_teste_proficiencia(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_aluno),
):
    aluno = db.query(AlunoModel).filter(AlunoModel.pessoa_id == current_user.pessoa_id).first()
    concluido = aluno is not None and aluno.nivel_questao_avaliado_em is not None
    return {
        "concluido": concluido,
        "nivel": aluno.nivel_questao if concluido else None,
        "avaliado_em": aluno.nivel_questao_avaliado_em,
    }


@router.get("/teste-proficiencia/questoes", response_model=list[QuestaoPortalOut])
def questoes_proficiencia(
    nivel: str = Query(...),
    excluir_ids: str = Query(""),
    db: Session = Depends(get_db),
    _: User = Depends(require_aluno),
):
    excluir = [int(x) for x in excluir_ids.split(",") if x.strip().isdigit()]
    q = db.query(Questao).filter(Questao.nivel == nivel, Questao.ativo == True)
    if excluir:
        q = q.filter(~Questao.id.in_(excluir))
    candidatas = q.all()
    sample = random.sample(candidatas, min(3, len(candidatas)))
    return [QuestaoPortalOut.model_validate(q) for q in sample]


@router.post("/teste-proficiencia/avaliar-completo")
def avaliar_completo_proficiencia(
    dados: AvaliarCompletoIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_aluno),
):
    from fastapi import HTTPException
    aluno = db.query(AlunoModel).filter(AlunoModel.pessoa_id == current_user.pessoa_id).first()
    if not aluno:
        raise HTTPException(status_code=404)
    if aluno.nivel_questao_avaliado_em is not None:
        raise HTTPException(status_code=409, detail="Teste já realizado")

    # Registrar respostas e agrupar acertos por nível
    nivel_acertos: dict[str, int] = {}
    nivel_total: dict[str, int] = {}

    for r in dados.respostas:
        questao = db.query(Questao).filter(Questao.id == r.questao_id).first()
        if not questao:
            continue
        acertou = verificar_resposta(questao, r.resposta_dada)
        questao_repo.registrar_resposta(
            db, current_user.pessoa_id, r.questao_id, r.resposta_dada, acertou, "proficiencia"
        )
        nivel_acertos[questao.nivel] = nivel_acertos.get(questao.nivel, 0) + (1 if acertou else 0)
        nivel_total[questao.nivel] = nivel_total.get(questao.nivel, 0) + 1

    # Encontrar o maior nível consecutivo aprovado (≥2 acertos) a partir do A1
    nivel_final = NIVEIS_CEFR[0]
    for nivel in NIVEIS_CEFR:
        if nivel_total.get(nivel, 0) == 0:
            break
        if nivel_acertos.get(nivel, 0) >= 2:
            nivel_final = nivel
        else:
            break

    aluno.nivel_questao = nivel_final
    aluno.nivel_questao_avaliado_em = datetime.utcnow()
    db.commit()

    return {"nivel": nivel_final}



# ── Progressão de nível ───────────────────────────────────────────────────────

@router.get("/nivel-progresso")
def nivel_progresso(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_aluno),
):
    aluno = db.query(AlunoModel).filter(AlunoModel.pessoa_id == current_user.pessoa_id).first()
    nivel_atual = aluno.nivel_questao if aluno else None

    if not nivel_atual:
        return {"nivel_atual": None, "elegivel_upgrade": False, "proximo_nivel": None,
                "total_respondidas": 0, "acertos": 0, "percentual": 0}

    respostas = (
        db.query(QuestaoResposta)
        .join(Questao, QuestaoResposta.questao_id == Questao.id)
        .filter(
            QuestaoResposta.aluno_id == current_user.pessoa_id,
            QuestaoResposta.origem == "banco",
            Questao.nivel == nivel_atual,
        )
        .order_by(QuestaoResposta.respondida_em.desc())
        .limit(20)
        .all()
    )

    # Primeira ocorrência de cada questão = peso 1.0; repetições = peso 0.25
    vistas: set[int] = set()
    peso_total = 0.0
    acertos_ponderados = 0.0
    for r in respostas:
        peso = 1.0 if r.questao_id not in vistas else 0.25
        vistas.add(r.questao_id)
        peso_total += peso
        if r.acertou:
            acertos_ponderados += peso

    total = len(respostas)
    acertos = sum(1 for r in respostas if r.acertou)
    percentual = round(acertos_ponderados / peso_total * 100) if peso_total > 0 else 0
    elegivel = peso_total >= 10 and percentual >= 75

    idx = NIVEIS_CEFR.index(nivel_atual) if nivel_atual in NIVEIS_CEFR else -1
    proximo_nivel = NIVEIS_CEFR[idx + 1] if idx >= 0 and idx < len(NIVEIS_CEFR) - 1 else None

    return {
        "nivel_atual": nivel_atual,
        "total_respondidas": total,
        "acertos": acertos,
        "percentual": percentual,
        "elegivel_upgrade": elegivel,
        "proximo_nivel": proximo_nivel,
    }


@router.get("/resumo", response_model=ResumoPortalOut)
def resumo(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_aluno),
):
    """Dados para a home: próxima aula, streak de questões, questão do dia e nível."""
    aluno_id = current_user.pessoa_id

    proxima = (
        _query_aulas_do_aluno(db, aluno_id)
        .filter(Aula.data >= date.today(), Aula.status == "agendada")
        .order_by(Aula.data.asc(), Aula.hora_inicio.asc())
        .first()
    )

    streak_dias = questao_repo.calcular_streak(db, aluno_id)

    diaria_hoje = questao_repo.buscar_diaria_hoje(db, aluno_id, date.today())
    questao_respondida_hoje = diaria_hoje.respondida if diaria_hoje else False

    aluno = db.query(AlunoModel).filter(AlunoModel.pessoa_id == aluno_id).first()

    return ResumoPortalOut(
        proxima_aula=_aula_to_out(proxima) if proxima else None,
        streak_dias=streak_dias,
        questao_respondida_hoje=questao_respondida_hoje,
        nivel_atual=aluno.nivel_questao if aluno else None,
    )
