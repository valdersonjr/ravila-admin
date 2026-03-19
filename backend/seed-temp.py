"""
Seed temporário.

Uso:
    cd backend
    python seed-temp.py
"""

import sys
import os
from pathlib import Path
from datetime import date, timedelta
from decimal import Decimal
import random

random.seed(42)

base_dir = Path(__file__).parent.resolve()
sys.path.insert(0, str(base_dir))
os.chdir(str(base_dir))

env_file = base_dir / ".env"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())

import bcrypt as _bcrypt

def get_password_hash(password: str) -> str:
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()

from app.database import SessionLocal
from app.models import (
    Base, Pessoa, User, Nivel, Professor, Aluno,
    Turma, HorarioTurma, Aula, Matricula, Presenca,
    PagamentoAluno, PagamentoProfessor,
)
from sqlalchemy import text

db = SessionLocal()

# ── Limpar ────────────────────────────────────────────────────────────────────
print("🗑  Limpando banco...")
db.execute(text(
    "TRUNCATE TABLE pagamentos_professor, pagamentos_aluno, presencas, "
    "matriculas, aulas, horarios_turma, turmas, alunos, professores, "
    "users, niveis, pessoas RESTART IDENTITY CASCADE"
))
db.commit()

# ── Helpers ───────────────────────────────────────────────────────────────────
def add(obj):
    db.add(obj); db.flush(); return obj

def pessoa(nome, cpf, email=None, telefone=None, nascimento=None):
    return add(Pessoa(nome=nome, cpf=cpf.replace(".", "").replace("-", ""),
                      email=email, telefone=telefone, data_nascimento=nascimento))

def user(p, senha, role):
    return add(User(pessoa_id=p.id, senha_hash=get_password_hash(senha), role=role, ativo=True))

def professor(p, contrato, salario=None, valor_aula=None):
    return add(Professor(
        pessoa_id=p.id, tipo_contrato=contrato,
        salario=Decimal(str(salario)) if salario else None,
        valor_por_aula=Decimal(str(valor_aula)) if valor_aula else None,
        ativo=True,
    ))

def aluno(p, nivel, responsavel=None):
    return add(Aluno(pessoa_id=p.id, nivel_id=nivel.id,
                     responsavel_id=responsavel.id if responsavel else None, status="ativo"))

def turma(nome, nivel, prof, status="ativa"):
    return add(Turma(nome=nome, nivel_id=nivel.id, professor_id=prof.pessoa_id, status=status))

def horario(t, dia, inicio, fim):
    return add(HorarioTurma(turma_id=t.id, dia_semana=dia, hora_inicio=inicio, hora_fim=fim))

def matricula(al, t, inicio, status="ativa"):
    return add(Matricula(aluno_id=al.pessoa_id, turma_id=t.id, data_inicio=inicio, status=status))

def gerar_aulas(t, prof, prof_nome, data_inicio, data_fim):
    horarios = db.query(HorarioTurma).filter(HorarioTurma.turma_id == t.id).all()
    criadas = []
    d = data_inicio
    while d <= data_fim:
        for h in horarios:
            if d.weekday() == h.dia_semana:
                a = add(Aula(
                    turma_id=t.id, data=d,
                    hora_inicio=h.hora_inicio, hora_fim=h.hora_fim,
                    professor_id=prof.pessoa_id, professor_nome_snapshot=prof_nome,
                    tipo="regular", status="agendada",
                ))
                criadas.append(a)
        d += timedelta(days=1)
    return criadas

# ── Níveis ────────────────────────────────────────────────────────────────────
print("📚 Níveis...")
n_beg = add(Nivel(nome="Beginner",         ordem=1, ativo=True))
n_ele = add(Nivel(nome="Elementary",       ordem=2, ativo=True))
n_pre = add(Nivel(nome="Pre-Intermediate", ordem=3, ativo=True))
n_int = add(Nivel(nome="Intermediate",     ordem=4, ativo=True))
n_adv = add(Nivel(nome="Advanced",         ordem=5, ativo=True))

# ── Admin ─────────────────────────────────────────────────────────────────────
print("👤 Admin...")
p_admin = pessoa("Valderson Junior", "70168845113", "admin@ravilas.com.br", "(31) 99999-0000")
user(p_admin, "admin", "admin")

# ── Professores ───────────────────────────────────────────────────────────────
print("👩‍🏫 Professores...")
p_flavia  = pessoa("Flávia Ribeiro",   "111.111.111-11", "flavia@ravilas.com.br",  "(31) 98888-1111", date(1990, 4, 15))
p_rodrigo = pessoa("Rodrigo Almeida", "222.222.222-22", "rodrigo@ravilas.com.br", "(31) 98888-2222", date(1987, 9, 23))

user(p_flavia,  "admin", "professor")
user(p_rodrigo, "admin", "professor")

prof_flavia  = professor(p_flavia,  "clt", salario=3200.00)
prof_rodrigo = professor(p_rodrigo, "pj",  valor_aula=85.00)

# ── Responsáveis ──────────────────────────────────────────────────────────────
print("👪 Responsáveis...")
resp1 = pessoa("Carlos Mendes",   "555.001.001-01", telefone="(31) 97777-0001")
resp2 = pessoa("Patrícia Costa",  "555.002.002-02", telefone="(31) 97777-0002")

# ── Alunos ────────────────────────────────────────────────────────────────────
print("🎓 Alunos...")
al1 = aluno(pessoa("Isabela Carvalho", "601.001.001-01", "isabela@gmail.com", "(31) 96666-0001", date(1999, 3, 10)), n_pre)
al2 = aluno(pessoa("Thiago Nascimento","601.002.002-02", "thiago@gmail.com",  "(31) 96666-0002", date(1995, 7, 22)), n_int)
al3 = aluno(pessoa("Camila Freitas",   "601.003.003-03", "camila@gmail.com",  "(31) 96666-0003", date(2001, 1, 5)),  n_ele)
al4 = aluno(pessoa("Lucas Barbosa",    "601.004.004-04", "lucas@gmail.com",   "(31) 96666-0004", date(1998, 11, 18)),n_int)
al5 = aluno(pessoa("Mariana Teixeira", "601.005.005-05", "mariana@gmail.com", "(31) 96666-0005", date(2000, 6, 30)), n_adv)
al6 = aluno(pessoa("Eduardo Nunes",    "601.006.006-06", "eduardo@gmail.com", "(31) 96666-0006", date(1993, 8, 14)), n_pre)
# Menores
al7 = aluno(pessoa("Sofia Mendes",     "601.007.007-07", nascimento=date(2012, 5, 20)), n_beg, resp1)
al8 = aluno(pessoa("Miguel Costa",     "601.008.008-08", nascimento=date(2011, 3, 8)),  n_ele, resp2)

# ── Turmas ────────────────────────────────────────────────────────────────────
print("🏫 Turmas...")
t1 = turma("Beginner Kids A",        n_beg, prof_flavia)
horario(t1, 0, "14:00", "15:00")  # seg
horario(t1, 2, "14:00", "15:00")  # qua

t2 = turma("Pre-Intermediate B",     n_pre, prof_flavia)
horario(t2, 1, "19:00", "20:30")  # ter
horario(t2, 3, "19:00", "20:30")  # qui

t3 = turma("Intermediate Adults C",  n_int, prof_rodrigo)
horario(t3, 1, "20:30", "22:00")  # ter
horario(t3, 3, "20:30", "22:00")  # qui

t4 = turma("Advanced D",             n_adv, prof_rodrigo)
horario(t4, 0, "18:00", "19:30")  # seg
horario(t4, 4, "18:00", "19:30")  # sex

# ── Matrículas ────────────────────────────────────────────────────────────────
print("📋 Matrículas...")
inicio = date(2025, 1, 1)
matricula(al7, t1, inicio)
matricula(al8, t1, inicio)
matricula(al1, t2, inicio)
matricula(al6, t2, inicio)
matricula(al2, t3, inicio)
matricula(al4, t3, inicio)
matricula(al5, t4, inicio)

# ── Aulas ─────────────────────────────────────────────────────────────────────
print("📅 Aulas...")
hoje = date.today()
inicio_aulas = hoje - timedelta(days=30)   # ~1 mês atrás
fim_futuro   = hoje + timedelta(days=14)   # 2 semanas à frente

aulas_t1 = gerar_aulas(t1, prof_flavia,  "Flávia Ribeiro",   inicio_aulas, fim_futuro)
aulas_t2 = gerar_aulas(t2, prof_flavia,  "Flávia Ribeiro",   inicio_aulas, fim_futuro)
aulas_t3 = gerar_aulas(t3, prof_rodrigo, "Rodrigo Almeida",  inicio_aulas, fim_futuro)
aulas_t4 = gerar_aulas(t4, prof_rodrigo, "Rodrigo Almeida",  inicio_aulas, fim_futuro)
db.flush()

# Status das aulas passadas
for aulas in [aulas_t1, aulas_t2, aulas_t3, aulas_t4]:
    for i, a in enumerate(aulas):
        if a.data < hoje:
            a.status = "cancelada" if i % 8 == 7 else "realizada"
db.flush()

# ── Substituições de professor ────────────────────────────────────────────────
# Algumas aulas realizadas no passado foram cobertas pelo outro professor.
# Rodrigo substituiu Flávia em ~1 aula por mês nas turmas dela.
# Flávia substituiu Rodrigo em ~1 aula por mês nas turmas dele.
print("🔄 Substituições...")

def substituir_algumas(aulas, sub_prof_id, sub_nome, taxa=0.08):
    """Marca ~taxa das aulas realizadas passadas com professor substituto."""
    candidatas = [a for a in aulas if a.status == "realizada" and a.data < hoje]
    n = max(1, round(len(candidatas) * taxa))
    escolhidas = random.sample(candidatas, min(n, len(candidatas)))
    for a in escolhidas:
        a.professor_id = sub_prof_id
        a.professor_nome_snapshot = sub_nome

substituir_algumas(aulas_t1, prof_rodrigo.pessoa_id, "Rodrigo Almeida")
substituir_algumas(aulas_t2, prof_rodrigo.pessoa_id, "Rodrigo Almeida")
substituir_algumas(aulas_t3, prof_flavia.pessoa_id,  "Flávia Ribeiro")
substituir_algumas(aulas_t4, prof_flavia.pessoa_id,  "Flávia Ribeiro")
db.flush()

# ── Presenças ─────────────────────────────────────────────────────────────────
print("✅ Presenças...")
mapa = {
    t1.id: [al7, al8],
    t2.id: [al1, al6],
    t3.id: [al2, al4],
    t4.id: [al5],
}
# Presença varia por turma para tornar os números mais interessantes
taxa_presenca = {t1.id: 0.90, t2.id: 0.80, t3.id: 0.85, t4.id: 0.75}
for aulas in [aulas_t1, aulas_t2, aulas_t3, aulas_t4]:
    for a in aulas:
        if a.status != "realizada": continue
        for al in mapa[a.turma_id]:
            add(Presenca(aula_id=a.id, aluno_id=al.pessoa_id,
                         tipo="matriculado", presente=random.random() < taxa_presenca[a.turma_id]))

# ── Helpers de data ───────────────────────────────────────────────────────────
def mes_ref(meses_atras: int) -> str:
    """Retorna referência MM/YYYY de N meses atrás."""
    m = hoje.month - meses_atras
    y = hoje.year
    while m <= 0:
        m += 12
        y -= 1
    return f"{m:02d}/{y}"

def aulas_dadas_no_mes(aulas_list, ref: str) -> int:
    """Conta aulas realizadas pelo professor original OU como substituto no mês."""
    m, y = ref.split("/")
    return sum(1 for a in aulas_list
               if a.status == "realizada"
               and a.data.month == int(m) and a.data.year == int(y))

# ── Pagamentos alunos ─────────────────────────────────────────────────────────
print("💰 Pagamentos alunos...")
mensalidade = Decimal("350.00")
todos_alunos = [al1, al2, al3, al4, al5, al6, al7, al8]

for i, al in enumerate(todos_alunos):
    # Últimos 5 meses — todos pagos
    for n in range(5, 0, -1):
        ref = mes_ref(n)
        add(PagamentoAluno(
            aluno_id=al.pessoa_id, aluno_nome_snapshot=al.pessoa.nome,
            referencia=ref, valor=mensalidade, status="pago",
            forma="pix", data_pagamento=hoje.replace(day=5) - timedelta(days=n * 30),
        ))
    # Mês atual — metade pago, metade pendente
    ref_atual = mes_ref(0)
    status_atual = "pago" if i % 2 == 0 else "pendente"
    add(PagamentoAluno(
        aluno_id=al.pessoa_id, aluno_nome_snapshot=al.pessoa.nome,
        referencia=ref_atual, valor=mensalidade,
        status=status_atual,
        forma="pix" if status_atual == "pago" else None,
        data_pagamento=hoje if status_atual == "pago" else None,
    ))

# ── Pagamentos professores ────────────────────────────────────────────────────
print("💸 Pagamentos professores...")

todas_flavia  = aulas_t1 + aulas_t2
todas_rodrigo = aulas_t3 + aulas_t4

for n in range(5, 0, -1):
    ref = mes_ref(n)
    dia_pgto = hoje.replace(day=5) - timedelta(days=n * 30)

    # Flávia: aulas que ela de fato deu (professor_id == dela)
    aulas_f = sum(1 for a in todas_flavia
                  if a.status == "realizada" and a.professor_id == prof_flavia.pessoa_id
                  and a.data.month == int(ref.split("/")[0])
                  and a.data.year  == int(ref.split("/")[1]))
    add(PagamentoProfessor(
        professor_id=prof_flavia.pessoa_id, professor_nome_snapshot="Flávia Ribeiro",
        tipo_contrato_snapshot="clt", referencia=ref,
        valor_total=Decimal("3200.00"),
        aulas_realizadas_snapshot=aulas_f, forma="transferencia", data_pagamento=dia_pgto,
    ))

    # Rodrigo: aulas que ele de fato deu (professor_id == dele), incluindo substituições em t1/t2
    aulas_r = sum(1 for a in todas_flavia + todas_rodrigo
                  if a.status == "realizada" and a.professor_id == prof_rodrigo.pessoa_id
                  and a.data.month == int(ref.split("/")[0])
                  and a.data.year  == int(ref.split("/")[1]))
    add(PagamentoProfessor(
        professor_id=prof_rodrigo.pessoa_id, professor_nome_snapshot="Rodrigo Almeida",
        tipo_contrato_snapshot="pj", referencia=ref,
        valor_total=Decimal(str(aulas_r * 85)),
        aulas_realizadas_snapshot=aulas_r, forma="pix",
        data_pagamento=hoje.replace(day=10) - timedelta(days=n * 30),
    ))

# ── Commit ────────────────────────────────────────────────────────────────────
db.commit()
print()
print("✅ Seed concluído!")
print()
print("  LOGINS")
print("  Admin:    70168845113 / admin")
print("  Flávia:   11111111111 / admin")
print("  Rodrigo:  22222222222 / admin")
