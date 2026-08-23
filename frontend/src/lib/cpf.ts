export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatCpf(value: string): string {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function checkDigit(partial: string, start: number): number {
  const total = partial
    .split('')
    .reduce((sum, digit, index) => sum + Number(digit) * (start - index), 0);
  const remainder = (total * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

export function isValidCpf(value: string): boolean {
  const digits = digitsOnly(value);
  if (digits.length !== 11 || digits === digits[0].repeat(11)) return false;
  if (checkDigit(digits.slice(0, 9), 10) !== Number(digits[9])) return false;
  return checkDigit(digits.slice(0, 10), 11) === Number(digits[10]);
}
