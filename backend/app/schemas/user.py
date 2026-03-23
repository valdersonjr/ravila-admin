from typing import Optional
from pydantic import BaseModel, ConfigDict

from app.schemas.pessoa import PessoaOut


class UserCreate(BaseModel):
    username: str
    senha: str
    is_admin: bool = False
    is_secretario: bool = False
    pessoa_id: Optional[int] = None


class UserUpdate(BaseModel):
    username: Optional[str] = None
    is_admin: Optional[bool] = None
    is_secretario: Optional[bool] = None
    senha: Optional[str] = None
    ativo: Optional[bool] = None


class UserOut(BaseModel):
    id: int
    username: str
    pessoa_id: Optional[int] = None
    is_admin: bool
    is_secretario: bool
    ativo: bool
    pessoa: Optional[PessoaOut] = None

    model_config = ConfigDict(from_attributes=True)
