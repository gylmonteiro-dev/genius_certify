import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n';
import { ApiError } from '../lib/api';
import { solicitarRecuperacaoParticipante } from '../lib/participanteAuth';
import { AuthSplitLayout } from './AuthSplitLayout';


export const ParticipanteRecoverPasswordView: React.FC = () => {
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await solicitarRecuperacaoParticipante(email.trim().toLowerCase());
      setSent(true);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : t('login.recoverFallback'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout
      headline={t('participant.recoverTitle')}
      subtitle={t('participant.recoverHint')}
    >
      <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          {t('participant.recoverTitle')}
        </h1>
        <p className="text-sm text-slate-500 mt-1">{t('participant.recoverHint')}</p>
        {sent ? (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
            {t('login.recoverSent')}
          </div>
        ) : (
          <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                {t('common.email')}
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              {isSubmitting ? t('login.recoverSending') : t('login.recoverSubmit')}
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
