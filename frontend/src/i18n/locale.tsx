import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { en } from './en';
import { ptBR, type Messages } from './pt-BR';

export type Locale = 'pt-BR' | 'en';

export type TranslateFn = (path: string, vars?: Record<string, string | number>) => string;

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslateFn;
  dateLocale: string;
}

const STORAGE_KEY = 'genius-certify-locale';
const DEFAULT_LOCALE: Locale = 'pt-BR';

const dictionaries: Record<Locale, Messages> = {
  'pt-BR': ptBR,
  en,
};

function readStoredLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'pt-BR') return stored;
  } catch {
    // ignore unavailable storage
  }
  return DEFAULT_LOCALE;
}

function applyHtmlLang(locale: Locale) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;
}

function getByPath(obj: unknown, path: string): string | undefined {
  const value = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
  return typeof value === 'string' ? value : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`,
  );
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() =>
    typeof window === 'undefined' ? DEFAULT_LOCALE : readStoredLocale(),
  );

  useEffect(() => {
    applyHtmlLang(locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore unavailable storage
    }
    applyHtmlLang(next);
  }, []);

  const t = useCallback<TranslateFn>(
    (path, vars) => {
      const raw = getByPath(dictionaries[locale], path) ?? path;
      return interpolate(raw, vars);
    },
    [locale],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      dateLocale: locale === 'en' ? 'en-US' : 'pt-BR',
    }),
    [locale, setLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export function useT(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useT must be used within LocaleProvider');
  }
  return ctx;
}
