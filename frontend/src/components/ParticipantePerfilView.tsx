import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n';
import {
  ContaParticipante,
  alterarSenhaParticipante,
  atualizarPerfilParticipante,
} from '../lib/participanteAuth';
import { ApiError } from '../lib/api';
import { formatCpf } from '../lib/cpf';
import { DateField } from './DateField';
import { PublicLayout } from './PublicLayout';

interface ParticipantePerfilViewProps {
  conta: ContaParticipante;
  token: string;
  onContaUpdated: (conta: ContaParticipante) => void;
  onLogout: () => void;
}

export const ParticipantePerfilView: React.FC<ParticipantePerfilViewProps> = ({
  conta,
  token,
  onContaUpdated,
  onLogout,
}) => {
  const { t } = useT();
  const [email, setEmail] = useState(conta.email);
  const [dataNascimento, setDataNascimento] = useState(conta.data_nascimento ?? '');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handleProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setProfileLoading(true);
    try {
      const updated = await atualizarPerfilParticipante(token, {
        email: email.trim().toLowerCase(),
        data_nascimento: dataNascimento,
        senha_atual: profilePassword,
      });
      onContaUpdated(updated);
      setProfilePassword('');
      setProfileSuccess(t('participant.profileUpdated'));
    } catch (error) {
      setProfileError(
        error instanceof ApiError ? error.message : t('participant.profileUpdateError'),
      );
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    if (newPassword.length < 8) {
      setPasswordError(t('settings.passwordMin'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('settings.passwordMismatch'));
      return;
    }
    setPasswordLoading(true);
    try {
      await alterarSenhaParticipante(token, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess(t('toasts.passwordUpdated'));
    } catch (error) {
      setPasswordError(
        error instanceof ApiError ? error.message : t('participant.passwordUpdateError'),
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {t('participant.profileTitle')}
            </h1>
            <p className="text-sm text-slate-500 mt-1">{t('participant.profileSubtitle')}</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/minhas-inscricoes"
              className="text-sm font-semibold px-3 py-2 rounded-md border border-slate-200 bg-white"
            >
              {t('participant.backToEnrollments')}
            </Link>
            <button
              type="button"
              onClick={onLogout}
              className="text-sm font-semibold px-3 py-2 rounded-md border border-slate-200 bg-white"
            >
              {t('participant.logout')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <form
            onSubmit={(event) => void handleProfile(event)}
            className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4"
          >
            <h2 className="text-lg font-bold text-slate-900">
              {t('participant.personalData')}
            </h2>
            {profileError && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {profileError}
              </div>
            )}
            {profileSuccess && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {profileSuccess}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                {t('common.fullName')}
              </label>
              <input
                readOnly
                value={conta.nome}
                className="w-full border border-slate-200 rounded-md px-3 py-2.5 text-sm bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                {t('students.document')}
              </label>
              <input
                readOnly
                value={formatCpf(conta.documento)}
                className="w-full border border-slate-200 rounded-md px-3 py-2.5 text-sm font-mono bg-slate-100"
              />
              <p className="mt-1 text-xs text-slate-400">
                {t('participant.documentReadonly')}
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                {t('common.email')}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full border border-slate-200 rounded-md px-3 py-2.5 text-sm bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                {t('common.birthDate')}
              </label>
              <DateField
                value={dataNascimento}
                onChange={setDataNascimento}
                required
                className="w-full border border-slate-200 rounded-md px-3 py-2.5 text-sm bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                {t('settings.currentPassword')}
              </label>
              <input
                type="password"
                minLength={8}
                required
                autoComplete="current-password"
                value={profilePassword}
                onChange={(event) => setProfilePassword(event.target.value)}
                className="w-full border border-slate-200 rounded-md px-3 py-2.5 text-sm bg-slate-50"
              />
              <p className="mt-1 text-xs text-slate-400">
                {t('participant.passwordRequiredForProfile')}
              </p>
            </div>
            <button
              type="submit"
              disabled={profileLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-md font-semibold text-sm disabled:opacity-60"
            >
              {profileLoading ? t('common.saving') : t('participant.updateProfile')}
            </button>
          </form>

          <form
            onSubmit={(event) => void handlePassword(event)}
            className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4"
          >
            <h2 className="text-lg font-bold text-slate-900">
              {t('settings.changePassword')}
            </h2>
            {passwordError && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {passwordSuccess}
              </div>
            )}
            {[
              [t('settings.currentPassword'), currentPassword, setCurrentPassword, 'current-password'],
              [t('settings.newPassword'), newPassword, setNewPassword, 'new-password'],
              [t('settings.confirmPassword'), confirmPassword, setConfirmPassword, 'new-password'],
            ].map(([label, value, setter, autoComplete]) => (
              <div key={label as string}>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  {label as string}
                </label>
                <input
                  type="password"
                  minLength={8}
                  required
                  autoComplete={autoComplete as string}
                  value={value as string}
                  onChange={(event) =>
                    (setter as React.Dispatch<React.SetStateAction<string>>)(event.target.value)
                  }
                  className="w-full border border-slate-200 rounded-md px-3 py-2.5 text-sm bg-slate-50"
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={passwordLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-md font-semibold text-sm disabled:opacity-60"
            >
              {passwordLoading ? t('common.saving') : t('settings.updatePassword')}
            </button>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
};
