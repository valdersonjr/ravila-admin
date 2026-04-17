"""
Seed script — cria os níveis CEFR.

Executar dentro do container:
    docker-compose exec app python seed_niveis.py
"""
import sys
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.nivel import Nivel

NIVEIS = [
    (1, "A1 Iniciante"),
    (2, "A2 Básico"),
    (3, "B1 Intermediário"),
    (4, "B2 Intermediário Superior"),
    (5, "C1 Avançado"),
    (6, "C2 Proficiente"),
]


def run(db: Session) -> None:
    criados = 0
    pulados = 0
    for ordem, nome in NIVEIS:
        existente = db.query(Nivel).filter(Nivel.nome == nome).first()
        if existente:
            print(f"  [PULADO] {nome}")
            pulados += 1
            continue
        db.add(Nivel(nome=nome, ordem=ordem, ativo=True))
        print(f"  [OK] {nome}")
        criados += 1
    db.commit()
    print(f"\n✓ {criados} nível(is) criado(s), {pulados} já existia(m).")


if __name__ == "__main__":
    db: Session = next(get_db())
    try:
        run(db)
    except Exception as e:
        print(f"Erro fatal: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()
