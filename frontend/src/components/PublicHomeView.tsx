import React from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n';
import { APP_NAME } from '../lib/brand';
import { BrandLogo } from './BrandLogo';
import { LanguageSwitch } from './LanguageSwitch';

const ACTIONS = [
  {
    to: '/eventos',
    icon: 'event',
    titleKey: 'public.homeEventsTitle',
    hintKey: 'public.homeEventsHint',
  },
  {
    to: '/meus-certificados',
    icon: 'workspace_premium',
    titleKey: 'public.homeCertificatesTitle',
    hintKey: 'public.homeCertificatesHint',
  },
  {
    to: '/validar',
    icon: 'verified',
    titleKey: 'public.homeValidateTitle',
    hintKey: 'public.homeValidateHint',
  },
] as const;

export const PublicHomeView: React.FC = () => {
  const { t } = useT();

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex font-sans relative">
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitch />
      </div>

      <main className="flex-1 flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <BrandLogo size="md" />
            <h1 className="mt-6 text-2xl font-bold text-slate-900 tracking-tight">
              {t('public.homeTitle')}
            </h1>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              {t('public.homeSubtitle')}
            </p>
            <Link
              to="/entrar"
              className="mt-5 inline-flex items-center justify-center gap-2 bg-[#0f172a] hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg font-semibold text-sm shadow-sm transition-colors active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">login</span>
              {t('public.adminLogin')}
            </Link>
          </div>

          <div className="space-y-4">
            {ACTIONS.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="group bg-white border border-slate-200 rounded-xl p-5 md:p-6 shadow-sm hover:border-blue-300 hover:shadow-md transition-all flex gap-4"
              >
                <span className="material-symbols-outlined text-blue-600 text-[28px] shrink-0">
                  {action.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    {t(action.titleKey)}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                    {t(action.hintKey)}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                    {t('public.homeAccess')}
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-6 lg:hidden">
            {APP_NAME}
          </p>
        </div>
      </main>

      <aside className="hidden lg:flex w-[42%] max-w-[520px] bg-[#0f172a] text-slate-300 flex-col justify-between p-10 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 20% 20%, rgba(37,99,235,0.45), transparent 45%), radial-gradient(circle at 80% 80%, rgba(14,165,233,0.25), transparent 40%)',
          }}
        />

        <div className="relative z-10">
          <div className="mb-10">
            <BrandLogo onDark size="lg" />
          </div>

          <h1 className="text-3xl font-bold text-white tracking-tight leading-snug max-w-sm">
            {t('public.homeTitle')}
          </h1>
          <p className="mt-4 text-sm text-slate-400 max-w-sm leading-relaxed">
            {t('public.homeSubtitle')}
          </p>
          <Link
            to="/entrar"
            className="mt-8 inline-flex items-center justify-center gap-2 bg-white text-[#0f172a] hover:bg-slate-100 px-4 py-2.5 rounded-lg font-semibold text-sm shadow-sm transition-colors active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">login</span>
            {t('public.adminLogin')}
          </Link>
        </div>

        <p className="relative z-10 text-xs text-slate-500">{APP_NAME}</p>
      </aside>
    </div>
  );
};
