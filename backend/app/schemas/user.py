from typing import Optional
from pydantic import BaseModel, ConfigDict

from app.schemas.pessoa import PessoaOut


class UserCreate(BaseModel):
    pessoa_id: int
    senha: str
    is_admin: bool = False
    is_secretario: bool = False


class UserUpdate(BaseModel):
    is_admin: Optional[bool] = None
    is_secretario: Optional[bool] = None
    senha: Optional[str] = None
    ativo: Optional[bool] = None


class UserOut(BaseModel):
    pessoa_id: int
    is_admin: bool
    is_secretario: bool
    ativo: bool
    pessoa: PessoaOut

    model_config = ConfigDict(from_attributes=True)
