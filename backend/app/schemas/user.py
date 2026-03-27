from typing import Optional
from pydantic import BaseModel, ConfigDict

from app.schemas.pessoa import PessoaOut


class UserCreate(BaseModel):
    username: str
    senha: str
    role: str = "secretario"
    pessoa_id: Optional[int] = None


class UserUpdate(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
    senha: Optional[str] = None
    ativo: Optional[bool] = None


class UserOut(BaseModel):
    id: int
    username: str
    pessoa_id: Optional[int] = None
    role: str
    ativo: bool
    pessoa: Optional[PessoaOut] = None

    model_config = ConfigDict(from_attributes=True)
