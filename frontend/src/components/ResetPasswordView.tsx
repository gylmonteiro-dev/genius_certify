import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useT } from '../i18n';
import { ApiError } from '../lib/api';
import { confirmPasswordReset } from '../lib/auth';
import { APP_NAME } from '../lib/brand';
import { AuthSplitLayout } from './AuthSplitLayout';

export const ResetPasswordView: React.FC = () => {
  const { t } = useT();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setErrorMessage(t('login.resetMissingToken'));
      return;
    }
    if (password.length < 8) {
      setErrorMessage(t('settings.passwordMin'));
      return;
    }
    if (password !== confirm) {
      setErrorMessage(t('settings.passwordMismatch'));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await confirmPasswordReset(token, password);
      navigate('/entrar', { replace: true, state: { passwordReset: true } });
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? err.message : t('login.resetInvalid'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout
      headline={t('login.resetTitle')}
      subtitle={t('login.resetHint')}
      footer={
        <>
          <p className="text-center text-[11px] text-slate-400 mt-6">
            <Link to="/entrar" className="text-blue-600 hover:underline font-semibold">
              {t('login.backToLogin')}
            </Link>
          </p>
          <p className="text-center text-[11px] text-slate-400 mt-2">{APP_NAME}</p>
        </>
      }
    >
      <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t('login.resetTitle')}
          </h2>
          <p className="text-sm text-slate-500 mt-1">{t('login.resetHint')}</p>
        </div>

        {!token ? (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
            <span className="material-symbols-outlined text-[16px] mt-0.5">error</span>
            <span>{t('login.resetMissingToken')}</span>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            <div>
              <label
                htmlFor="reset_password"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
              >
                {t('settings.newPassword')}
              </label>
              <input
                id="reset_password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label
                htmlFor="reset_confirm"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
              >
                {t('settings.confirmPassword')}
              </label>
              <input
                id="reset_confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
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
                  <span className="material-symbols-outlined text-[18px] animate-spin">
                    progress_activity
                  </span>
                  {t('login.resetSaving')}
                </>
              ) : (
                t('login.resetSubmit')
              )}
            </button>
          </form>
        )}
      </div>
    </AuthSplitLayout>
  );
};
