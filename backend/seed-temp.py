"""
Seed padrão — cria apenas usuários iniciais.

Uso:
    cd backend
    python seed-temp.py
"""

import sys
import os
from pathlib import Path

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
from app.models import Pessoa, User

db = SessionLocal()

def add(obj):
    db.add(obj); db.flush(); return obj

def criar_usuario(nome, cpf, email, senha, role):
    p = add(Pessoa(nome=nome, cpf=cpf.replace(".", "").replace("-", ""), email=email))
    add(User(pessoa_id=p.id, senha_hash=get_password_hash(senha), role=role, ativo=True))
    return p

print("👤 Criando usuários padrão...")

criar_usuario("Ravila",   "05101170151", "ravilaravani1@gmail.com", "India2016",  "admin")
criar_usuario("Valderson", "70168845113", "valdersonpontes@gmail.com", "V@lderson123", "admin")
criar_usuario("Professor", "11111111111", "professor@ravilas.com.br", "professor",   "professor")

db.commit()
print()
print("✅ Seed concluído!")
print()
print("  LOGINS")
print("  Admin 1:     05101170151 / India2016")
print("  Admin 2:     70168845113 / V@lderson123")
print("  Professor:   11111111111 / professor")
