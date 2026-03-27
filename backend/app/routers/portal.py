"""
Portal do aluno — endpoints exclusivos para usuários com role='aluno'.
Retorna apenas dados do próprio aluno autenticado.
"""
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import require_aluno
from app.models.aluno import Aluno
from app.models.aula import Aula
from app.models.contrato import Contrato
from app.models.material import Material
from app.models.matricula import Matricula
from app.models.presenca import Presenca
from app.models.user import User
from app.schemas.material import MaterialPortalOut
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
    streak_semanas: int
    proxima_aula: Optional[AulaPortalOut]


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


def _calcular_streak(db: Session, aluno_id: int) -> int:
    """Conta semanas ISO consecutivas com pelo menos 1 presença confirmada."""
    presencas = (
        db.query(Presenca)
        .options(joinedload(Presenca.aula))
        .filter(Presenca.aluno_id == aluno_id, Presenca.presente == True)
        .all()
    )

    semanas_com_presenca: set[tuple[int, int]] = set()
    for p in presencas:
        if p.aula:
            iso = p.aula.data.isocalendar()
            semanas_com_presenca.add((iso.year, iso.week))

    if not semanas_com_presenca:
        return 0

    streak = 0
    hoje = date.today()
    ano, semana, _ = hoje.isocalendar()

    # Se a semana atual ainda não tem presença, começa pela anterior
    if (ano, semana) not in semanas_com_presenca:
        d = date.fromisocalendar(ano, semana, 1) - timedelta(weeks=1)
        ano, semana, _ = d.isocalendar()

    while (ano, semana) in semanas_com_presenca:
        streak += 1
        d = date.fromisocalendar(ano, semana, 1) - timedelta(weeks=1)
        ano, semana, _ = d.isocalendar()

    return streak


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


@router.get("/resumo", response_model=ResumoPortalOut)
def resumo(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_aluno),
):
    """Dados para a home: streak + próxima aula. Uma única chamada."""
    streak = _calcular_streak(db, current_user.pessoa_id)

    proxima = (
        _query_aulas_do_aluno(db, current_user.pessoa_id)
        .filter(Aula.data >= date.today(), Aula.status == "agendada")
        .order_by(Aula.data.asc(), Aula.hora_inicio.asc())
        .first()
    )

    return ResumoPortalOut(
        streak_semanas=streak,
        proxima_aula=_aula_to_out(proxima) if proxima else None,
    )
