import re
from decimal import Decimal
from datetime import date
from pathlib import Path

from fastapi import HTTPException, status
from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session
from weasyprint import HTML as WeasyHTML

from app.models.contrato import Contrato
from app.repositories import contrato as contrato_repo
from app.repositories import aluno as aluno_repo
from app.repositories import pessoa as pessoa_repo
from app.schemas.contrato import ContratoCreate, ContratoUpdate, ContratoStatusUpdate, ContratoListOut

_TRANSICOES_VALIDAS = {
    "rascunho": {"ativo"},
    "ativo": {"encerrado", "rescindido"},
    "encerrado": set(),
    "rescindido": set(),
}


def _resolver_alunos(db: Session, aluno_ids: list[int]):
    alunos = []
    for aid in aluno_ids:
        aluno = aluno_repo.buscar_por_pessoa_id(db, aid)
        if not aluno:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Aluno {aid} não encontrado")
        alunos.append(aluno)
    return alunos


def listar(
    db: Session,
    status_filter: str | None = None,
    aluno_id: int | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> ContratoListOut:
    items, total = contrato_repo.listar(db, status_filter, aluno_id, search, page, page_size)
    return ContratoListOut(items=items, total=total, page=page, page_size=page_size)


def buscar(db: Session, contrato_id: int) -> Contrato:
    contrato = contrato_repo.buscar_por_id(db, contrato_id)
    if not contrato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contrato não encontrado")
    return contrato


def criar(db: Session, dados: ContratoCreate) -> Contrato:
    contratante = pessoa_repo.buscar_por_id(db, dados.contratante_id)
    if not contratante:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contratante não encontrado")
    if not contratante.cpf:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O contratante deve possuir CPF cadastrado",
        )
    if dados.data_fim <= dados.data_inicio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Data de fim deve ser posterior à data de início",
        )

    alunos = _resolver_alunos(db, dados.aluno_ids)

    payload = dados.model_dump(exclude={"aluno_ids"})
    if dados.data_fim < date.today():
        payload["status"] = "encerrado"
    return contrato_repo.criar(db, payload, alunos)


def atualizar(db: Session, contrato_id: int, dados: ContratoUpdate) -> Contrato:
    contrato = buscar(db, contrato_id)
    if contrato.status not in ("rascunho", "ativo"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apenas contratos em rascunho ou ativos podem ser editados",
        )
    data = dados.model_dump(exclude_unset=True, exclude={"aluno_ids"})
    if "data_inicio" in data and "data_fim" in data and data["data_fim"] <= data["data_inicio"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Data de fim deve ser posterior à data de início",
        )

    alunos = None
    if dados.aluno_ids is not None:
        alunos = _resolver_alunos(db, dados.aluno_ids)

    data_fim_final = data.get("data_fim", contrato.data_fim)
    if data_fim_final < date.today() and contrato.status == "rascunho":
        data["status"] = "encerrado"

    return contrato_repo.atualizar(db, contrato, data, alunos)


def atualizar_status(db: Session, contrato_id: int, dados: ContratoStatusUpdate) -> Contrato:
    contrato = buscar(db, contrato_id)
    permitidos = _TRANSICOES_VALIDAS.get(contrato.status, set())
    if dados.status not in permitidos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transição de '{contrato.status}' para '{dados.status}' não permitida",
        )
    if dados.status == "ativo" and contrato.tipo == "formal" and not contrato.contrato_assinado_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="É necessário fazer o upload do contrato assinado antes de ativá-lo",
        )
    return contrato_repo.atualizar(db, contrato, {"status": dados.status})


def _fmt_brl(valor) -> str:
    v = float(valor)
    integer_part = int(v)
    decimal_part = round((v - integer_part) * 100)
    integer_str = f"{integer_part:,}".replace(",", ".")
    return f"R$ {integer_str},{decimal_part:02d}"


def gerar_pdf(db: Session, contrato_id: int) -> bytes:
    contrato = buscar(db, contrato_id)

    # Logo SVG — resize for header
    static_dir = Path(__file__).parent.parent / "static"
    logo_path = static_dir / "logo.svg"
    logo_svg = ""
    if logo_path.exists():
        raw = logo_path.read_text(encoding="utf-8")
        raw = re.sub(r'width="\d+"', 'width="50"', raw)
        raw = re.sub(r'height="\d+"', 'height="26"', raw)
        logo_svg = raw

    # Format helpers
    def fmt_date(d):
        return d.strftime("%d/%m/%Y") if d else "___/___/______"

    cpf = contrato.contratante.cpf or ""
    cpf_formatado = (
        f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}"
        if len(cpf) == 11
        else cpf or "___.___.___-__"
    )

    valor_com_desconto = None
    desconto_label = None
    if contrato.desconto_percentual:
        v = float(contrato.valor_mensalidade) * (1 - float(contrato.desconto_percentual) / 100)
        valor_com_desconto = _fmt_brl(v)
        desconto_label = f"{contrato.desconto_percentual}%"
    elif contrato.desconto_valor:
        v = float(contrato.valor_mensalidade) - float(contrato.desconto_valor)
        valor_com_desconto = _fmt_brl(max(v, 0))
        desconto_label = _fmt_brl(contrato.desconto_valor)

    # Render Jinja2 template
    template_dir = Path(__file__).parent.parent / "templates"
    env = Environment(loader=FileSystemLoader(str(template_dir)), autoescape=False)
    template = env.get_template("contrato.html")

    html_str = template.render(
        contrato=contrato,
        contratante=contrato.contratante,
        logo_svg=logo_svg,
        cpf_formatado=cpf_formatado,
        valor_mensalidade=_fmt_brl(contrato.valor_mensalidade),
        valor_com_desconto=valor_com_desconto,
        desconto_label=desconto_label,
        valor_reposicao=_fmt_brl(contrato.valor_reposicao_hora),
        data_inicio=fmt_date(contrato.data_inicio),
        data_fim=fmt_date(contrato.data_fim),
    )

    return WeasyHTML(string=html_str).write_pdf()


def gerar_instrucoes_gerais(db: Session, contrato_id: int) -> bytes:
    contrato = buscar(db, contrato_id)

    static_dir = Path(__file__).parent.parent / "static"
    logo_path = static_dir / "logo.svg"
    logo_svg = ""
    if logo_path.exists():
        raw = logo_path.read_text(encoding="utf-8")
        raw = re.sub(r'width="\d+"', 'width="50"', raw)
        raw = re.sub(r'height="\d+"', 'height="26"', raw)
        logo_svg = raw

    def fmt_date(d):
        return d.strftime("%d/%m/%Y") if d else "___/___/______"

    cpf = contrato.contratante.cpf or ""
    cpf_formatado = (
        f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}"
        if len(cpf) == 11
        else cpf or "___.___.___-__"
    )

    valor_com_desconto = None
    desconto_label = None
    if contrato.desconto_percentual:
        v = float(contrato.valor_mensalidade) * (1 - float(contrato.desconto_percentual) / 100)
        valor_com_desconto = _fmt_brl(v)
        desconto_label = f"{contrato.desconto_percentual}%"
    elif contrato.desconto_valor:
        v = float(contrato.valor_mensalidade) - float(contrato.desconto_valor)
        valor_com_desconto = _fmt_brl(max(v, 0))
        desconto_label = _fmt_brl(contrato.desconto_valor)

    template_dir = Path(__file__).parent.parent / "templates"
    env = Environment(loader=FileSystemLoader(str(template_dir)), autoescape=False)
    template = env.get_template("instrucoes_gerais.html")

    html_str = template.render(
        contrato=contrato,
        contratante=contrato.contratante,
        logo_svg=logo_svg,
        cpf_formatado=cpf_formatado,
        valor_mensalidade=_fmt_brl(contrato.valor_mensalidade),
        valor_com_desconto=valor_com_desconto,
        desconto_label=desconto_label,
        valor_reposicao=_fmt_brl(contrato.valor_reposicao_hora),
        data_inicio=fmt_date(contrato.data_inicio),
        data_fim=fmt_date(contrato.data_fim),
        data_emissao=fmt_date(date.today()),
    )

    return WeasyHTML(string=html_str).write_pdf()
