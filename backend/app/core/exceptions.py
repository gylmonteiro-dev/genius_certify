from fastapi import status


class AppError(Exception):
    """Erro de domínio com status HTTP associado."""

    def __init__(self, message: str, *, status_code: int = status.HTTP_400_BAD_REQUEST) -> None:
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Credenciais inválidas") -> None:
        super().__init__(message, status_code=status.HTTP_401_UNAUTHORIZED)


class ForbiddenError(AppError):
    def __init__(self, message: str = "Acesso negado") -> None:
        super().__init__(message, status_code=status.HTTP_403_FORBIDDEN)


class NotFoundError(AppError):
    def __init__(self, message: str = "Recurso não encontrado") -> None:
        super().__init__(message, status_code=status.HTTP_404_NOT_FOUND)


class ConflictError(AppError):
    def __init__(self, message: str = "Conflito de dados") -> None:
        super().__init__(message, status_code=status.HTTP_409_CONFLICT)
