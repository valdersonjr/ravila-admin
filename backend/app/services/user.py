from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.repositories import user as user_repo
from app.repositories import professor as professor_repo
from app.repositories import aluno as aluno_repo
from app.schemas.user import UserCreate, UserUpdate

ROLES_VALIDOS = {"admin", "secretario", "professor", "aluno"}
ROLES_COM_PESSOA = {"professor", "aluno"}


def listar(db: Session, role: str | None = None) -> list[User]:
    return user_repo.listar(db, role)


def buscar(db: Session, user_id: int) -> User:
    user = user_repo.buscar_por_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )
    return user


def criar(db: Session, dados: UserCreate) -> User:
    if dados.role not in ROLES_VALIDOS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Role inválido: {dados.role}")

    if user_repo.buscar_por_username(db, dados.username):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username já está em uso")

    if dados.role in ROLES_COM_PESSOA and not dados.pessoa_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Usuário do tipo {dados.role} precisa ter uma pessoa vinculada",
        )

    if dados.pessoa_id is not None:
        if user_repo.buscar_por_pessoa_id(db, dados.pessoa_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta pessoa já possui um usuário")
        if dados.role == "professor" and not professor_repo.buscar_por_pessoa_id(db, dados.pessoa_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Para criar um acesso de professor, cadastre primeiro o professor no sistema.",
            )
        if dados.role == "aluno" and not aluno_repo.buscar_por_pessoa_id(db, dados.pessoa_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Para criar um acesso de aluno, cadastre primeiro o aluno no sistema.",
            )

    payload = {
        "username": dados.username,
        "pessoa_id": dados.pessoa_id,
        "senha_hash": hash_password(dados.senha),
        "role": dados.role,
        "ativo": True,
    }
    return user_repo.criar(db, payload)


def atualizar(
    db: Session,
    user_id: int,
    dados: UserUpdate,
    pessoa_id_in_body: bool = False,
    pessoa_id_value: int | None = None,
) -> User:
    user = buscar(db, user_id)
    data = dados.model_dump(exclude_unset=True)

    if "senha" in data:
        user.senha_hash = hash_password(data.pop("senha"))

    if "username" in data and data["username"] != user.username:
        if user_repo.buscar_por_username(db, data["username"]):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username já está em uso")

    if "role" in data and data["role"] not in ROLES_VALIDOS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Role inválido: {data['role']}")

    if pessoa_id_in_body:
        data["pessoa_id"] = pessoa_id_value

    role_final = data.get("role", user.role)
    pessoa_id_final = data.get("pessoa_id", user.pessoa_id) if pessoa_id_in_body else user.pessoa_id

    if role_final in ROLES_COM_PESSOA and not pessoa_id_final:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Usuário do tipo {role_final} precisa ter uma pessoa vinculada",
        )

    return user_repo.atualizar(db, user, data)


def deletar(db: Session, user_id: int) -> None:
    user = buscar(db, user_id)
    user_repo.deletar(db, user)
