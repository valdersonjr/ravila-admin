from pydantic import BaseModel


class LoginRequest(BaseModel):
    cpf: str
    senha: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    pessoa_id: int
    nome: str
