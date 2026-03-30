import asyncio
import re
from datetime import date, datetime, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, UploadFile, File, status
from fastapi.responses import Response
from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session
from weasyprint import HTML as WeasyHTML

from app.core.limiter import limiter
from app.database import get_db
from app.dependencies import require_staff
from app.models.contrato import Contrato
from app.models.user import User
from app.repositories import contrato as contrato_repo
from app.schemas.contrato import ContratoCreate, ContratoUpdate, ContratoStatusUpdate, ContratoOut, ContratoListOut
from app.services import contrato as contrato_service
from app.services import s3 as s3_service

router = APIRouter(prefix="/contratos", tags=["contratos"])


@router.get("/indicadores")
def indicadores(
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    ativos = db.query(Contrato).filter(Contrato.status == "ativo").all()
    hoje = date.today()
    em_30_dias = hoje + timedelta(days=30)

    receita = Decimal("0")
    for c in ativos:
        v = c.valor_mensalidade
        if c.desconto_percentual:
            v = v * (1 - c.desconto_percentual / 100)
        elif c.desconto_valor:
            v = max(v - c.desconto_valor, Decimal("0"))
        receita += v

    return {
        "receita_mensal_prevista": float(receita),
        "total_ativos": len(ativos),
        "expirando_30_dias": sum(1 for c in ativos if c.data_fim <= em_30_dias),
        "sem_assinado": sum(1 for c in ativos if not c.contrato_assinado_key),
        "rascunhos": db.query(Contrato).filter(Contrato.status == "rascunho").count(),
    }


def _fmt_brl(valor) -> str:
    v = float(valor)
    integer_part = int(v)
    decimal_part = round((v - integer_part) * 100)
    integer_str = f"{integer_part:,}".replace(",", ".")
    return f"R$ {integer_str},{decimal_part:02d}"


def _valor_liquido(c: Contrato) -> Decimal:
    v = c.valor_mensalidade
    if c.desconto_percentual:
        v = v * (1 - c.desconto_percentual / 100)
    elif c.desconto_valor:
        v = max(v - c.desconto_valor, Decimal("0"))
    return v


def _desconto_label(c: Contrato) -> str | None:
    if c.desconto_percentual:
        pct = float(c.desconto_percentual)
        return f"{pct:g}%"
    if c.desconto_valor:
        return f"− {_fmt_brl(c.desconto_valor)}"
    return None


@router.get("/relatorio-receita/pdf")
@limiter.limit("5/minute")
async def relatorio_receita_pdf(
    request: Request,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    from calendar import monthrange
    from sqlalchemy import text as sa_text

    _MESES_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                 "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

    hoje = date.today()
    em_30_dias = hoje + timedelta(days=30)
    em_60_dias = hoje + timedelta(days=60)

    # ── Mês de referência ─────────────────────────────────────────────────────
    if hoje.day > 10:
        mes_ref = date(hoje.year + 1, 1, 1) if hoje.month == 12 else date(hoje.year, hoje.month + 1, 1)
    else:
        mes_ref = date(hoje.year, hoje.month, 1)
    mes_referencia = f"{_MESES_PT[mes_ref.month - 1]}/{mes_ref.year}"

    # ── Contratos ativos ──────────────────────────────────────────────────────
    ativos = (
        db.query(Contrato)
        .filter(Contrato.status == "ativo")
        .order_by(Contrato.id.asc())
        .all()
    )

    receita_bruta = Decimal("0")
    receita_liquida = Decimal("0")
    num_com_desconto = 0
    expirando_lista = []
    rows = []

    for c in ativos:
        liq = _valor_liquido(c)
        receita_bruta += c.valor_mensalidade
        receita_liquida += liq
        if c.desconto_percentual or c.desconto_valor:
            num_com_desconto += 1

        expirando_30 = c.data_fim <= em_30_dias
        alunos_str = ", ".join(a.pessoa.nome for a in c.alunos) if c.alunos else c.contratante.nome

        row = {
            "id": c.id,
            "alunos": alunos_str,
            "curso": c.curso,
            "tipo": c.tipo,
            "dia_vencimento": c.dia_vencimento,
            "data_inicio": c.data_inicio.strftime("%d/%m/%Y"),
            "data_fim": c.data_fim.strftime("%d/%m/%Y"),
            "valor_integral": _fmt_brl(c.valor_mensalidade),
            "desconto_label": _desconto_label(c),
            "valor_liquido": _fmt_brl(liq),
            "valor_liquido_raw": float(liq),
            "expirando": expirando_30,
        }
        rows.append(row)
        if expirando_30:
            expirando_lista.append(row)

    total_descontos = receita_bruta - receita_liquida
    ticket_medio = receita_liquida / len(ativos) if ativos else Decimal("0")
    receita_liquida_f = float(receita_liquida)

    # ── 1. Projeção de receita — próximos 3 meses ─────────────────────────────
    def _mes_proximo(base: date, n: int) -> date:
        m, y = base.month + n, base.year
        while m > 12:
            m -= 12
            y += 1
        return date(y, m, 1)

    def _ultimo_dia(d: date) -> date:
        return date(d.year, d.month, monthrange(d.year, d.month)[1])

    projecao = []
    for i in range(1, 4):
        primeiro = _mes_proximo(mes_ref, i)
        ultimo = _ultimo_dia(primeiro)
        rec = sum(
            float(_valor_liquido(c)) for c in ativos
            if c.data_inicio <= ultimo and c.data_fim >= primeiro
        )
        n_contratos = sum(
            1 for c in ativos
            if c.data_inicio <= ultimo and c.data_fim >= primeiro
        )
        delta = rec - receita_liquida_f
        projecao.append({
            "mes": f"{_MESES_PT[primeiro.month - 1]}/{primeiro.year}",
            "receita": _fmt_brl(rec),
            "n_contratos": n_contratos,
            "delta": f"{'−' if delta < 0 else '+'} {_fmt_brl(abs(delta))}",
            "delta_negativo": delta < 0,
        })

    # ── 2. Receita por modalidade ─────────────────────────────────────────────
    modalidades: dict[str, dict] = {}
    for c in ativos:
        curso = c.curso or "Não informado"
        liq = float(_valor_liquido(c))
        if curso not in modalidades:
            modalidades[curso] = {"curso": curso, "contratos": 0, "bruta": 0.0, "liquida": 0.0}
        modalidades[curso]["contratos"] += 1
        modalidades[curso]["bruta"] += float(c.valor_mensalidade)
        modalidades[curso]["liquida"] += liq

    modalidades_lista = sorted(modalidades.values(), key=lambda x: x["liquida"], reverse=True)
    for m in modalidades_lista:
        pct = (m["liquida"] / receita_liquida_f * 100) if receita_liquida_f else 0
        m["pct"] = f"{pct:.1f}%"
        m["bruta_fmt"] = _fmt_brl(m["bruta"])
        m["liquida_fmt"] = _fmt_brl(m["liquida"])

    # ── 3. Concentração de receita (Pareto) ───────────────────────────────────
    rows_sorted = sorted(rows, key=lambda r: r["valor_liquido_raw"], reverse=True)
    top3_total = sum(r["valor_liquido_raw"] for r in rows_sorted[:3])
    top3_pct = (top3_total / receita_liquida_f * 100) if receita_liquida_f else 0
    pareto = {
        "top3": rows_sorted[:3],
        "top3_pct": f"{top3_pct:.1f}%",
        "top3_total": _fmt_brl(top3_total),
        "risco_alto": top3_pct >= 40,
    }

    # ── 4. Score de churn ─────────────────────────────────────────────────────
    # Alunos de contratos que expiram em ≤ 60 dias
    contratos_em_risco = [c for c in ativos if c.data_fim <= em_60_dias]
    aluno_contrato: dict[int, Contrato] = {}
    for c in contratos_em_risco:
        for a in c.alunos:
            aluno_contrato[a.pessoa_id] = c

    churn_rows = []
    if aluno_contrato:
        data_28d = hoje - timedelta(days=28)
        presenca_raw = db.execute(sa_text("""
            SELECT p.aluno_id,
                   COUNT(*) AS total,
                   SUM(CASE WHEN p.presente THEN 1 ELSE 0 END) AS presentes
            FROM presencas p
            JOIN aulas a ON a.id = p.aula_id
            WHERE p.aluno_id = ANY(:ids)
              AND p.tipo = 'matriculado'
              AND a.data >= :inicio
              AND a.data <= :hoje
              AND a.status = 'realizada'
            GROUP BY p.aluno_id
        """), {"ids": list(aluno_contrato.keys()), "inicio": data_28d, "hoje": hoje}).fetchall()

        presenca_map = {r.aluno_id: (r.total, r.presentes) for r in presenca_raw}

        for aluno_id, contrato in aluno_contrato.items():
            dias_restantes = (contrato.data_fim - hoje).days
            aluno_nome = next((a.pessoa.nome for a in contrato.alunos if a.pessoa_id == aluno_id), "—")

            if aluno_id not in presenca_map:
                continue  # sem dados de presença ainda — omite da análise

            total, presentes = presenca_map[aluno_id]
            taxa = round(presentes / total * 100) if total > 0 else 0
            presenca_label = f"{taxa}% ({presentes}/{total} aulas)"

            if taxa < 60:
                nivel = "CRÍTICO" if dias_restantes <= 30 else "ALTO RISCO"
                nivel_css = "critico"
            elif taxa < 80:
                nivel = "ATENÇÃO"
                nivel_css = "atencao"
            else:
                nivel = "PROVÁVEL RENOVAÇÃO"
                nivel_css = "ok"

            churn_rows.append({
                "aluno": aluno_nome,
                "contrato_id": contrato.id,
                "curso": contrato.curso,
                "dias_restantes": dias_restantes,
                "data_fim": contrato.data_fim.strftime("%d/%m/%Y"),
                "presenca": presenca_label,
                "nivel": nivel,
                "nivel_css": nivel_css,
                "valor_liquido": _fmt_brl(_valor_liquido(contrato)),
            })

        churn_rows.sort(key=lambda r: (0 if r["nivel_css"] == "critico" else 1 if r["nivel_css"] == "atencao" else 2, r["dias_restantes"]))

    # ── Logo SVG ──────────────────────────────────────────────────────────────
    static_dir = Path(__file__).parent.parent / "static"
    logo_path = static_dir / "logo.svg"
    logo_svg = ""
    if logo_path.exists():
        raw = logo_path.read_text(encoding="utf-8")
        raw = re.sub(r'width="\d+"', 'width="50"', raw)
        raw = re.sub(r'height="\d+"', 'height="26"', raw)
        logo_svg = raw

    template_dir = Path(__file__).parent.parent / "templates"
    env = Environment(loader=FileSystemLoader(str(template_dir)), autoescape=False)
    html_str = env.get_template("relatorio_receita.html").render(
        logo_svg=logo_svg,
        gerado_em=datetime.now().strftime("%d/%m/%Y às %H:%M"),
        mes_referencia=mes_referencia,
        total_ativos=len(ativos),
        receita_bruta=_fmt_brl(receita_bruta),
        receita_liquida=_fmt_brl(receita_liquida),
        total_descontos=_fmt_brl(total_descontos),
        ticket_medio=_fmt_brl(ticket_medio),
        num_com_desconto=num_com_desconto,
        expirando_30=len(expirando_lista),
        contratos=rows,
        expirando_lista=expirando_lista,
        projecao=projecao,
        modalidades=modalidades_lista,
        pareto=pareto,
        churn_rows=churn_rows,
    )

    pdf_bytes = await asyncio.to_thread(lambda: WeasyHTML(string=html_str).write_pdf())
    filename = f"receita_mensal_{hoje}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/", response_model=ContratoListOut)
def listar(
    status_filter: Optional[str] = Query(None, alias="status"),
    aluno_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    return contrato_service.listar(db, status_filter, aluno_id, search, page, page_size)


@router.post("/", response_model=ContratoOut, status_code=status.HTTP_201_CREATED)
def criar(
    body: ContratoCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    return contrato_service.criar(db, body)


@router.get("/{contrato_id}", response_model=ContratoOut)
def buscar(
    contrato_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    return contrato_service.buscar(db, contrato_id)


@router.put("/{contrato_id}", response_model=ContratoOut)
def atualizar(
    contrato_id: int,
    body: ContratoUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    return contrato_service.atualizar(db, contrato_id, body)


@router.patch("/{contrato_id}/status", response_model=ContratoOut)
def atualizar_status(
    contrato_id: int,
    body: ContratoStatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    return contrato_service.atualizar_status(db, contrato_id, body)


@router.post("/{contrato_id}/upload-assinado", response_model=ContratoOut)
def upload_assinado(
    contrato_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    contrato = contrato_service.buscar(db, contrato_id)
    file_bytes = file.file.read()
    key = s3_service.upload_contrato(file_bytes, contrato_id, file.filename or "assinado.pdf")
    return contrato_repo.atualizar(db, contrato, {"contrato_assinado_key": key})


@router.get("/{contrato_id}/download-assinado")
def download_assinado(
    contrato_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    contrato = contrato_service.buscar(db, contrato_id)
    if not contrato.contrato_assinado_key:
        return Response(status_code=404)
    key = contrato.contrato_assinado_key
    ext = key.rsplit(".", 1)[-1].lower() if "." in key else "pdf"
    content_type = "application/pdf" if ext == "pdf" else f"image/{ext}"
    file_bytes = s3_service.baixar_arquivo(key)
    nome = contrato.contratante.nome.replace(" ", "_")
    data = str(contrato.data_inicio)
    filename = f"contrato_{contrato_id}_{nome}_{data}.{ext}"
    return Response(
        content=file_bytes,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{contrato_id}/instrucoes-gerais")
@limiter.limit("10/minute")
async def baixar_instrucoes_gerais(
    request: Request,
    contrato_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    pdf_bytes = await asyncio.to_thread(contrato_service.gerar_instrucoes_gerais, db, contrato_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="instrucoes_gerais_{contrato_id}.pdf"'},
    )


@router.get("/{contrato_id}/pdf")
@limiter.limit("10/minute")
async def baixar_pdf(
    request: Request,
    contrato_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    pdf_bytes = await asyncio.to_thread(contrato_service.gerar_pdf, db, contrato_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="contrato_{contrato_id}.pdf"'},
    )
