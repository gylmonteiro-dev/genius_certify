import React from 'react';
import { useT } from '../i18n';

interface LanguageSwitchProps {
  className?: string;
}

export const LanguageSwitch: React.FC<LanguageSwitchProps> = ({ className = '' }) => {
  const { locale, setLocale, t } = useT();

  const optionClass = (active: boolean) =>
    `min-w-[2.25rem] h-7 px-2.5 rounded-full text-[11px] font-bold tracking-wide transition-colors ${
      active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
    }`;

  return (
    <div
      role="group"
      aria-label={t('language.label')}
      className={`inline-flex h-8 shrink-0 items-center rounded-full bg-slate-100 p-0.5 ${className}`}
    >
      <button
        type="button"
        onClick={() => setLocale('pt-BR')}
        className={optionClass(locale === 'pt-BR')}
        aria-pressed={locale === 'pt-BR'}
      >
        PT
      </button>
      <button
        type="button"
        onClick={() => setLocale('en')}
        className={optionClass(locale === 'en')}
        aria-pressed={locale === 'en'}
      >
        EN
      </button>
    </div>
  );
};
