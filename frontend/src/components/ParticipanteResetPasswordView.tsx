import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useT } from '../i18n';
import { ApiError } from '../lib/api';
import { redefinirSenhaParticipante } from '../lib/participanteAuth';
import { AuthSplitLayout } from './AuthSplitLayout';


export const ParticipanteResetPasswordView: React.FC = () => {
  const { t } = useT();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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
      await redefinirSenhaParticipante(token, password);
      navigate('/minhas-inscricoes/entrar', {
        replace: true,
        state: { passwordReset: true },
      });
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : t('login.resetInvalid'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout
      headline={t('login.resetTitle')}
      subtitle={t('login.resetHint')}
    >
      <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{t('login.resetTitle')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('login.resetHint')}</p>
        {!token ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
            {t('login.resetMissingToken')}
          </div>
        ) : (
          <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                {t('settings.newPassword')}
              </label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                {t('settings.confirmPassword')}
              </label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-sm"
              />
            </div>
            {errorMessage && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                {errorMessage}
              </div>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-lg font-semibold text-sm"
            >
              {isSubmitting ? t('login.resetSaving') : t('login.resetSubmit')}
            </button>
          </form>
        )}
        <Link
          to="/minhas-inscricoes/entrar"
          className="mt-6 inline-block text-sm font-semibold text-blue-600 hover:underline"
        >
          {t('participant.backToParticipantLogin')}
        </Link>
      </div>
    </AuthSplitLayout>
  );
};
