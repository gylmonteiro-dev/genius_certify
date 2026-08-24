import React from 'react';
import { BrandLogo } from './BrandLogo';
import { LanguageSwitch } from './LanguageSwitch';

interface AuthSplitLayoutProps {
  headline: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const AuthSplitLayout: React.FC<AuthSplitLayoutProps> = ({
  headline,
  subtitle,
  children,
  footer,
}) => {
  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex font-sans relative">
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitch />
      </div>
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
          <h2 className="text-3xl font-bold text-white tracking-tight leading-snug max-w-sm">
            {headline}
          </h2>
          <p className="mt-4 text-sm text-slate-400 max-w-sm leading-relaxed">{subtitle}</p>
        </div>
      </aside>

      <main className="flex-1 flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <BrandLogo size="md" />
          </div>
          {children}
          {footer}
        </div>
      </main>
    </div>
  );
};
