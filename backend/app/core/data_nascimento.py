from datetime import date, datetime

_MIN_AGE_YEARS = 10
_MAX_AGE_YEARS = 120
_CSV_FORMATS = ("%Y-%m-%d", "%d/%m/%Y")


def validate_data_nascimento(value: date) -> date:
    today = date.today()
    if value > today:
        raise ValueError("Data de nascimento não pode ser futura")

    age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
    if age < _MIN_AGE_YEARS:
        raise ValueError("Participante deve ter pelo menos 10 anos")
    if age > _MAX_AGE_YEARS:
        raise ValueError("Data de nascimento inválida")
    return value


def parse_data_nascimento(raw: str) -> date:
    text = raw.strip()
    if not text:
        raise ValueError("Data de nascimento é obrigatória")

    parsed: date | None = None
    for fmt in _CSV_FORMATS:
        try:
            parsed = datetime.strptime(text, fmt).date()
            break
        except ValueError:
            continue
    if parsed is None:
        raise ValueError("Data de nascimento inválida. Use YYYY-MM-DD ou DD/MM/YYYY")
    return validate_data_nascimento(parsed)
