from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.material import Material


def listar(
    db: Session,
    *,
    aula_id: Optional[int] = None,
    turma_id: Optional[int] = None,
    categoria: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[Material], int]:
    q = db.query(Material).options(joinedload(Material.turma))
    if aula_id is not None:
        q = q.filter(Material.aula_id == aula_id)
    if turma_id is not None:
        q = q.filter(Material.turma_id == turma_id)
    if categoria:
        q = q.filter(Material.categoria == categoria)
    q = q.order_by(Material.criado_em.desc())
    total = q.count()
    return q.offset(skip).limit(limit).all(), total


def listar_para_aluno(
    db: Session,
    *,
    aluno_id: int,
    turma_ids: list[int],
    aula_id: Optional[int] = None,
) -> list[Material]:
    """Retorna materiais visíveis para o aluno: da aula específica, da turma ou públicos."""
    from sqlalchemy import or_

    q = db.query(Material).filter(
        or_(
            Material.publico == True,
            Material.turma_id.in_(turma_ids) if turma_ids else False,
            Material.aula_id == aula_id if aula_id is not None else False,
        )
    )
    return q.order_by(Material.criado_em.desc()).all()


def listar_por_aula(db: Session, aula_id: int) -> list[Material]:
    return (
        db.query(Material)
        .filter(Material.aula_id == aula_id)
        .order_by(Material.criado_em.desc())
        .all()
    )


def buscar_por_id(db: Session, material_id: int) -> Optional[Material]:
    return (
        db.query(Material)
        .options(joinedload(Material.turma))
        .filter(Material.id == material_id)
        .first()
    )


def criar(db: Session, dados: dict) -> Material:
    m = Material(**dados)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


def atualizar(db: Session, material: Material, dados: dict) -> Material:
    for k, v in dados.items():
        setattr(material, k, v)
    db.commit()
    db.refresh(material)
    return material


def deletar(db: Session, material: Material) -> None:
    db.delete(material)
    db.commit()
