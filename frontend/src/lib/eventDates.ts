import { formatDateBr } from './dateBr';

export const MAX_EVENT_DATES = 366;

export type EventDateMode = 'periodo' | 'dias';

export type EventDateError = 'invalid' | 'endBeforeStart' | 'duplicate' | 'tooMany';

export type LocaleCode = 'pt-BR' | 'en';

function parseIso(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.slice(0, 10));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function toIso(value: Date): string {
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${value.getFullYear()}-${month}-${day}`;
}

export function normalizeEventDates(dates: Array<string | null | undefined>): string[] {
  const unique = new Set<string>();
  for (const item of dates) {
    if (!item) continue;
    const iso = item.slice(0, 10);
    if (parseIso(iso)) unique.add(iso);
  }
  return [...unique].sort();
}

export function isConsecutive(dates: string[]): boolean {
  const ordered = normalizeEventDates(dates);
  if (ordered.length < 2) return false;
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = parseIso(ordered[index - 1]);
    const current = parseIso(ordered[index]);
    if (!previous || !current) return false;
    const next = new Date(previous);
    next.setDate(next.getDate() + 1);
    if (toIso(next) !== toIso(current)) return false;
  }
  return true;
}

export function expandPeriod(
  start: string,
  end: string,
): { dates: string[] } | { error: EventDateError } {
  const first = parseIso(start);
  const last = parseIso(end);
  if (!first || !last) return { error: 'invalid' };
  if (last < first) return { error: 'endBeforeStart' };
  const dates: string[] = [];
  const cursor = new Date(first);
  while (cursor <= last) {
    dates.push(toIso(cursor));
    if (dates.length > MAX_EVENT_DATES) return { error: 'tooMany' };
    cursor.setDate(cursor.getDate() + 1);
  }
  return { dates };
}

export function addSpecificDate(
  current: string[],
  next: string,
): { dates: string[] } | { error: EventDateError } {
  const iso = next.slice(0, 10);
  if (!parseIso(iso)) return { error: 'invalid' };
  const ordered = normalizeEventDates(current);
  if (ordered.includes(iso)) return { error: 'duplicate' };
  if (ordered.length >= MAX_EVENT_DATES) return { error: 'tooMany' };
  return { dates: normalizeEventDates([...ordered, iso]) };
}

export function removeEventDate(current: string[], iso: string): string[] {
  return normalizeEventDates(current.filter((item) => item.slice(0, 10) !== iso.slice(0, 10)));
}

export function formatEventDateCompact(dates: string[]): string {
  const ordered = normalizeEventDates(dates);
  if (ordered.length === 0) return '';
  if (ordered.length === 1) return formatDateBr(ordered[0]);
  if (isConsecutive(ordered)) {
    return `${formatDateBr(ordered[0])} – ${formatDateBr(ordered[ordered.length - 1])}`;
  }
  return `${formatDateBr(ordered[0])} +${ordered.length - 1}`;
}

function joinDays(formatted: string[], locale: LocaleCode): string {
  if (formatted.length === 2) {
    return locale === 'en'
      ? `${formatted[0]} and ${formatted[1]}`
      : `${formatted[0]} e ${formatted[1]}`;
  }
  const head = formatted.slice(0, -1).join(', ');
  const last = formatted[formatted.length - 1];
  return locale === 'en' ? `${head} and ${last}` : `${head} e ${last}`;
}

export function formatEventDateSentence(dates: string[], locale: LocaleCode = 'pt-BR'): string {
  const ordered = normalizeEventDates(dates);
  if (ordered.length === 0) return '';
  const formatted = ordered.map((item) => formatDateBr(item));
  if (ordered.length === 1) {
    return locale === 'en'
      ? `The event was held on ${formatted[0]}.`
      : `O evento foi realizado em ${formatted[0]}.`;
  }
  if (isConsecutive(ordered)) {
    return locale === 'en'
      ? `The event was held from ${formatted[0]} to ${formatted[formatted.length - 1]}.`
      : `O evento foi realizado de ${formatted[0]} a ${formatted[formatted.length - 1]}.`;
  }
  const days = joinDays(formatted, locale);
  return locale === 'en'
    ? `The event was held on ${days}.`
    : `O evento foi realizado nos dias ${days}.`;
}

export function inferDateMode(dates: string[]): EventDateMode {
  return isConsecutive(dates) && normalizeEventDates(dates).length > 1 ? 'periodo' : 'dias';
}
