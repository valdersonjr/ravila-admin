from typing import Optional
from pydantic import BaseModel, ConfigDict


class LivroCreate(BaseModel):
    titulo: str


class LivroUpdate(BaseModel):
    titulo: Optional[str] = None
    ativo: Optional[bool] = None


class LivroOut(BaseModel):
    id: int
    titulo: str
    ativo: bool

    model_config = ConfigDict(from_attributes=True)
