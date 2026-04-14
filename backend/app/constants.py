"""
Constantes de domínio do sistema.
Centraliza todos os valores de status e tipos para evitar strings mágicas espalhadas no código.
"""


class AulaStatus:
    AGENDADA = "agendada"
    REALIZADA = "realizada"
    CANCELADA = "cancelada"
    PENDENTE_APROVACAO = "pendente_aprovacao"


class AulaTipo:
    REGULAR = "regular"
    SUBSTITUTIVA = "substitutiva"
    EXPERIMENTAL = "experimental"


class MatriculaStatus:
    ATIVA = "ativa"
    CANCELADA = "cancelada"
    CONCLUIDA = "concluida"


class PresencaTipo:
    MATRICULADO = "matriculado"
    EXPERIMENTAL = "experimental"
    SUBSTITUTO = "substituto"


class ReposicaoStatus:
    PENDENTE = "pendente"
    USADA = "usada"


class TurmaStatus:
    ATIVA = "ativa"
    ENCERRADA = "encerrada"


class UserRole:
    ADMIN = "admin"
    PROFESSOR = "professor"
    SECRETARIO = "secretario"
