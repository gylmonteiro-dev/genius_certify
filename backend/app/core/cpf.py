def normalize_cpf(value: str) -> str:
    """Normaliza e valida um CPF. Retorna 11 dígitos ou levanta ValueError."""
    digits = "".join(ch for ch in value if ch.isdigit())
    if len(digits) != 11 or digits == digits[0] * 11:
        raise ValueError("CPF inválido")

    first = _check_digit(digits[:9], start=10)
    if first != int(digits[9]):
        raise ValueError("CPF inválido")

    second = _check_digit(digits[:10], start=11)
    if second != int(digits[10]):
        raise ValueError("CPF inválido")

    return digits


def _check_digit(partial: str, *, start: int) -> int:
    total = sum(int(digit) * (start - index) for index, digit in enumerate(partial))
    remainder = (total * 10) % 11
    return 0 if remainder == 10 else remainder
