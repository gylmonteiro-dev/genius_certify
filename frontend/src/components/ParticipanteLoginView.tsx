import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthSplitLayout } from './AuthSplitLayout';
import { digitsOnly, formatCpf, isValidCpf } from '../lib/cpf';
import { useT } from '../i18n';

interface ParticipanteLoginViewProps {
  onSubmit: (documento: string, senha: string) => Promise<void>;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

export const ParticipanteLoginView: React.FC<ParticipanteLoginViewProps> = ({
  onSubmit,
  isSubmitting = false,
  errorMessage = null,
}) => {
  const { t } = useT();
  const location = useLocation();
  const passwordReset = Boolean(
    (location.state as { passwordReset?: boolean } | null)?.passwordReset,
  );
  const [documento, setDocumento] = useState('');
  const [senha, setSenha] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!isValidCpf(documento) || !senha) {
      setLocalError(t('participant.cpfInvalid'));
      return;
    }
    await onSubmit(digitsOnly(documento), senha);
  };

  return (
    <AuthSplitLayout
      headline={t('participant.loginHeadline')}
      subtitle={t('participant.loginSubtitle')}
    >
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
        {t('participant.loginTitle')}
      </h1>
      <p className="mt-2 text-sm text-slate-500">{t('participant.loginSubtitle')}</p>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
        {passwordReset && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {t('login.resetSuccess')}
          </div>
        )}
        {(errorMessage || localError) && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage ?? localError}
          </div>
        )}
        <div>
          <label
            htmlFor="participanteCpf"
            className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
          >
            {t('students.document')}
          </label>
          <input
            id="participanteCpf"
            type="text"
            value={documento}
            onChange={(e) => setDocumento(formatCpf(e.target.value))}
            placeholder={t('registration.documentPlaceholder')}
            inputMode="numeric"
            autoComplete="username"
            className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label
            htmlFor="participanteSenha"
            className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
          >
            {t('common.password')}
          </label>
          <input
            id="participanteSenha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            minLength={8}
            autoComplete="current-password"
            className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <div className="mt-2 text-right">
            <Link
              to="/minhas-inscricoes/recuperar"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              {t('login.forgotPassword')}
            </Link>
          </div>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-md disabled:opacity-60"
        >
          {isSubmitting ? t('participant.loggingIn') : t('participant.loginSubmit')}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-500">
        {t('participant.createAccessHint')}{' '}
        <Link to="/minhas-inscricoes/cadastrar" className="font-semibold text-blue-600 hover:underline">
          {t('participant.createAccess')}
        </Link>
      </p>
      <p className="mt-4 text-sm text-slate-500">
        {t('participant.institutionInstead')}{' '}
        <Link to="/entrar" className="font-semibold text-blue-600 hover:underline">
          {t('public.institutionAccess')}
        </Link>
      </p>
      <p className="mt-6 text-sm">
        <Link to="/" className="text-slate-500 hover:text-slate-800 font-semibold">
          {t('public.backHome')}
        </Link>
      </p>
    </AuthSplitLayout>
  );
};
