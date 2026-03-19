from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict

from app.schemas.pessoa import PessoaOut


class UserCreate(BaseModel):
    pessoa_id: int
    senha: str
    role: Literal["admin", "professor", "secretario"]


class UserUpdate(BaseModel):
    role: Optional[Literal["admin", "professor", "secretario"]] = None
    senha: Optional[str] = None
    ativo: Optional[bool] = None


class UserOut(BaseModel):
    pessoa_id: int
    role: str
    ativo: bool
    pessoa: PessoaOut

    model_config = ConfigDict(from_attributes=True)
