import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthSplitLayout } from './AuthSplitLayout';
import { digitsOnly, formatCpf, isValidCpf } from '../lib/cpf';
import { useT } from '../i18n';

interface ParticipanteRegisterViewProps {
  onSubmit: (payload: {
    documento: string;
    data_nascimento: string;
    email: string;
    senha: string;
  }) => Promise<void>;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

export const ParticipanteRegisterView: React.FC<ParticipanteRegisterViewProps> = ({
  onSubmit,
  isSubmitting = false,
  errorMessage = null,
}) => {
  const { t } = useT();
  const [documento, setDocumento] = useState('');
  const [email, setEmail] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [senha, setSenha] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!isValidCpf(documento) || !email || !dataNascimento || senha.length < 8) {
      setLocalError(t('participant.cpfInvalid'));
      return;
    }
    await onSubmit({
      documento: digitsOnly(documento),
      data_nascimento: dataNascimento,
      email: email.trim().toLowerCase(),
      senha,
    });
  };

  return (
    <AuthSplitLayout
      headline={t('participant.registerHeadline')}
      subtitle={t('participant.registerSubtitle')}
    >
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
        {t('participant.registerTitle')}
      </h1>
      <p className="mt-2 text-sm text-slate-500">{t('participant.registerSubtitle')}</p>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
        {(errorMessage || localError) && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage ?? localError}
          </div>
        )}
        <div>
          <label
            htmlFor="cadastroCpf"
            className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
          >
            {t('students.document')}
          </label>
          <input
            id="cadastroCpf"
            type="text"
            value={documento}
            onChange={(e) => setDocumento(formatCpf(e.target.value))}
            placeholder={t('registration.documentPlaceholder')}
            inputMode="numeric"
            className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label
            htmlFor="cadastroEmail"
            className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
          >
            {t('common.email')}
          </label>
          <input
            id="cadastroEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label
            htmlFor="cadastroNascimento"
            className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
          >
            {t('common.birthDate')}
          </label>
          <input
            id="cadastroNascimento"
            type="date"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label
            htmlFor="cadastroSenha"
            className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
          >
            {t('common.password')}
          </label>
          <input
            id="cadastroSenha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            minLength={8}
            autoComplete="new-password"
            className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <p className="text-xs text-slate-400 mt-1">{t('participant.passwordHint')}</p>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-md disabled:opacity-60"
        >
          {isSubmitting ? t('participant.registering') : t('participant.registerSubmit')}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-500">
        <Link to="/minhas-inscricoes/entrar" className="font-semibold text-blue-600 hover:underline">
          {t('participant.alreadyHaveAccess')}
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
