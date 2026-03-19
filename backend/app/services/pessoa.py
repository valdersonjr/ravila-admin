import re

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.pessoa import Pessoa
from app.repositories import pessoa as pessoa_repo
from app.schemas.pessoa import PessoaCreate, PessoaUpdate


def _clean_cpf(cpf: str) -> str:
    return re.sub(r"[.\-]", "", cpf)


def listar(db: Session, search: str | None = None) -> list[Pessoa]:
    return pessoa_repo.listar(db, search)


def buscar(db: Session, id: int) -> Pessoa:
    pessoa = pessoa_repo.buscar_por_id(db, id)
    if not pessoa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pessoa não encontrada",
        )
    return pessoa


def criar(db: Session, dados: PessoaCreate) -> Pessoa:
    payload = dados.model_dump()
    if dados.cpf:
        cpf = _clean_cpf(dados.cpf)
        if pessoa_repo.buscar_por_cpf(db, cpf):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"CPF {cpf} já cadastrado",
            )
        payload["cpf"] = cpf
    return pessoa_repo.criar(db, payload)


def atualizar(db: Session, id: int, dados: PessoaUpdate) -> Pessoa:
    pessoa = buscar(db, id)
    data = dados.model_dump(exclude_unset=True)
    if "cpf" in data and data["cpf"]:
        cpf = _clean_cpf(data["cpf"])
        if cpf != pessoa.cpf and pessoa_repo.buscar_por_cpf(db, cpf):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"CPF {cpf} já cadastrado",
            )
        data["cpf"] = cpf
    return pessoa_repo.atualizar(db, pessoa, data)
