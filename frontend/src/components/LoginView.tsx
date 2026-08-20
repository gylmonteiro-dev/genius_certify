import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n';
import { APP_NAME } from '../lib/brand';
import { BrandLogo } from './BrandLogo';
import { LanguageSwitch } from './LanguageSwitch';

interface LoginViewProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onSubmit,
  isSubmitting = false,
  errorMessage = null,
}) => {
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    await onSubmit(email.trim(), password);
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex font-sans relative">
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitch />
      </div>
      {/* Brand panel — mirrors sidebar palette */}
      <aside className="hidden lg:flex w-[42%] max-w-[520px] bg-[#0f172a] text-slate-300 flex-col justify-between p-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none"
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
            {t('login.headline')}
          </h2>
          <p className="mt-4 text-sm text-slate-400 max-w-sm leading-relaxed">
            {t('login.subtitle')}
          </p>
        </div>

        <div className="relative z-10 space-y-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-400 text-[18px]">verified_user</span>
            {t('login.featureAuth')}
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-400 text-[18px]">domain</span>
            {t('login.featureTenants')}
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-400 text-[18px]">picture_as_pdf</span>
            {t('login.featurePdf')}
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <BrandLogo size="md" />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{t('login.signIn')}</h2>
              <p className="text-sm text-slate-500 mt-1">
                {t('login.signInHint')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="login_email"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                >
                  {t('common.email')}
                </label>
                <input
                  id="login_email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@nexusgenius.com.br"
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="login_password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                >
                  {t('common.password')}
                </label>
                <div className="relative">
                  <input
                    id="login_password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 pr-11 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                  <span className="material-symbols-outlined text-[16px] mt-0.5">error</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white py-2.5 px-4 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    {t('login.signingIn')}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">login</span>
                    {t('login.signIn')}
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-6 space-x-3">
            <Link to="/validar" className="text-blue-600 hover:underline font-semibold">
              {t('login.validateCertificate')}
            </Link>
            <span>·</span>
            <Link to="/eventos" className="text-blue-600 hover:underline font-semibold">
              {t('login.publicEvents')}
            </Link>
          </p>
          <p className="text-center text-[11px] text-slate-400 mt-2">
            {APP_NAME}
          </p>
        </div>
      </main>
    </div>
  );
};
