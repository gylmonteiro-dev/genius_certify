import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useT } from '../i18n';
import { BrandLogo } from './BrandLogo';
import { LanguageSwitch } from './LanguageSwitch';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const { t } = useT();
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-semibold transition-colors ${
      isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
    }`;

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] font-sans">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 min-h-16 py-2 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center min-w-0">
            <BrandLogo size="sm" />
          </Link>
          <nav className="flex items-center gap-3 sm:gap-5 flex-wrap justify-end">
            <NavLink to="/validar" className={linkClass}>
              {t('public.validate')}
            </NavLink>
            <NavLink to="/eventos" className={linkClass}>
              {t('public.events')}
            </NavLink>
            <LanguageSwitch />
            <Link
              to="/"
              className="text-sm font-semibold px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800"
            >
              {t('public.adminLogin')}
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
};
