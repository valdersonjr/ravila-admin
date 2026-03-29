import re
from datetime import date, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session
from weasyprint import HTML as WeasyHTML

from app.database import get_db
from app.dependencies import require_admin, require_staff, get_current_user
from app.models.user import User
from app.schemas.professor import ProfessorCreate, ProfessorUpdate, ProfessorOut, ProfessorDashboardOut
from app.schemas.turma import GerarSemanaRelatorio, GerarSemanaRequest
from app.services import professor as professor_service
from app.services import turma as turma_service
from app.services import aula as aula_service

router = APIRouter(prefix="/professores", tags=["professores"])


@router.get("/", response_model=list[ProfessorOut])
def listar(
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    return professor_service.listar(db)


@router.post("/", response_model=ProfessorOut, status_code=status.HTTP_201_CREATED)
def criar(
    body: ProfessorCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return professor_service.criar(db, body)


@router.get("/{pessoa_id}", response_model=ProfessorOut)
def buscar(
    pessoa_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "professor" and current_user.pessoa_id != pessoa_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    return professor_service.buscar(db, pessoa_id)


@router.put("/{pessoa_id}", response_model=ProfessorOut)
def atualizar(
    pessoa_id: int,
    body: ProfessorUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return professor_service.atualizar(db, pessoa_id, body)


@router.get("/{pessoa_id}/dashboard", response_model=ProfessorDashboardOut)
def dashboard(
    pessoa_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "professor" and current_user.pessoa_id != pessoa_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    return professor_service.dashboard(db, pessoa_id)


_DIAS_PT = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"]
_MESES_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]


@router.get("/{pessoa_id}/agenda/pdf")
def agenda_pdf(
    pessoa_id: int,
    semana_inicio: date = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    professor = professor_service.buscar(db, pessoa_id)
    semana_fim = semana_inicio + timedelta(days=6)

    result = aula_service.listar(db, professor_id=pessoa_id, data_inicio=semana_inicio, data_fim=semana_fim, page_size=500)
    todas_aulas = result.items

    # Logo SVG
    static_dir = Path(__file__).parent.parent / "static"
    logo_path = static_dir / "logo.svg"
    logo_svg = ""
    if logo_path.exists():
        raw = logo_path.read_text(encoding="utf-8")
        raw = re.sub(r'width="\d+"', 'width="50"', raw)
        raw = re.sub(r'height="\d+"', 'height="26"', raw)
        logo_svg = raw

    # Group aulas by day
    dias_map: dict[date, list] = {}
    for aula in sorted(todas_aulas, key=lambda a: (a.data, a.hora_inicio)):
        dias_map.setdefault(aula.data, []).append(aula)

    dias = []
    for d in sorted(dias_map.keys()):
        dow = d.weekday()  # Monday=0 … Sunday=6; convert to Sun=0 … Sat=6
        dia_semana_idx = (dow + 1) % 7
        label = f"{_DIAS_PT[dia_semana_idx].capitalize()}, {d.day} de {_MESES_PT[d.month - 1]} de {d.year}"
        aulas_dia = []
        for a in dias_map[d]:
            turma_nome = a.turma.nome if a.turma else (f"Turma {a.turma_id}" if a.turma_id else "Aula avulsa")
            aulas_dia.append({
                "hora_inicio": a.hora_inicio[:5],
                "hora_fim": a.hora_fim[:5],
                "turma_nome": turma_nome,
                "aluno_snapshot": a.aluno_nome_snapshot if not a.turma_id else None,
                "tipo": a.tipo,
                "status": a.status,
            })
        dias.append({"label": label, "aulas": aulas_dia})

    # Label da semana
    def fmt(d: date) -> str:
        return f"{d.day} de {_MESES_PT[d.month - 1]}"
    label_semana = f"{fmt(semana_inicio)} – {fmt(semana_fim)} de {semana_fim.year}"

    # Stats
    contadores = {"realizada": 0, "agendada": 0, "cancelada": 0, "pendente_aprovacao": 0}
    for a in todas_aulas:
        contadores[a.status] = contadores.get(a.status, 0) + 1

    # Render
    template_dir = Path(__file__).parent.parent / "templates"
    env = Environment(loader=FileSystemLoader(str(template_dir)), autoescape=False)
    html_str = env.get_template("agenda_semana.html").render(
        logo_svg=logo_svg,
        professor_nome=professor.pessoa.nome,
        label_semana=label_semana,
        dias=dias,
        total=len(todas_aulas),
        realizadas=contadores["realizada"],
        agendadas=contadores["agendada"],
        canceladas=contadores["cancelada"],
        pendentes=contadores["pendente_aprovacao"],
    )

    pdf_bytes = WeasyHTML(string=html_str).write_pdf()
    filename = f"agenda_{semana_inicio}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{pessoa_id}/gerar-semana", response_model=GerarSemanaRelatorio)
def gerar_semana(
    pessoa_id: int,
    body: GerarSemanaRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "professor" and current_user.pessoa_id != pessoa_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    return turma_service.gerar_semana(db, dry_run=body.dry_run, professor_id=pessoa_id)
