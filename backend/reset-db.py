"""
Reseta o banco completamente e recria as tabelas via Alembic.

Uso (de qualquer lugar, sem Docker):
    cd backend
    python reset-db.py

Requer: psycopg2-binary e as variáveis do .env no mesmo diretório.
"""

import os
import sys
from pathlib import Path

# ── Carregar .env manualmente ─────────────────────────────────────────────────
env_path = Path(__file__).parent / ".env"
if not env_path.exists():
    print("❌  Arquivo .env não encontrado em", env_path)
    sys.exit(1)

for line in env_path.read_text().splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())

# ── Montar DATABASE_URL ───────────────────────────────────────────────────────
host     = os.environ["DB_HOST"]
user     = os.environ["DB_USER"]
password = os.environ["DB_PASSWORD"]
dbname   = os.environ["DB_NAME"]
sslmode  = os.environ.get("DB_SSLMODE", "require")

database_url = f"postgresql://{user}:{password}@{host}/{dbname}?sslmode={sslmode}&channel_binding=require"

# ── Resetar schema ────────────────────────────────────────────────────────────
import psycopg2

print("🔌  Conectando ao banco...")
conn = psycopg2.connect(database_url)
conn.autocommit = True
cur = conn.cursor()

print("🗑   Dropando schema public...")
cur.execute("DROP SCHEMA public CASCADE;")
cur.execute("CREATE SCHEMA public;")
print("✅  Schema recriado.")

cur.close()
conn.close()

# ── Rodar Alembic ────────────────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent))

from alembic.config import Config
from alembic import command

alembic_cfg = Config(str(Path(__file__).parent / "alembic.ini"))
alembic_cfg.set_main_option("script_location", str(Path(__file__).parent / "alembic"))

versions_dir = Path(__file__).parent / "alembic" / "versions"
versions_dir.mkdir(exist_ok=True)

has_migrations = any(versions_dir.glob("*.py"))
if not has_migrations:
    print("⚙️   Nenhuma migration encontrada — gerando migration inicial...")
    command.revision(alembic_cfg, autogenerate=True, message="initial")

print("⚙️   Rodando alembic upgrade head...")
command.upgrade(alembic_cfg, "head")

print()
print("✅  Banco resetado e migrations aplicadas!")
print("   Rode agora: docker-compose run --rm app python seed-temp.py")
