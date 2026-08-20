import React, { useState } from 'react';
import { AuthUser } from '../lib/auth';
import { labelRole, useT } from '../i18n';

interface SettingsViewProps {
  authUser: AuthUser;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  successMessage?: string | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  authUser,
  onChangePassword,
  isSubmitting = false,
  errorMessage = null,
  successMessage = null,
}) => {
  const { t } = useT();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (newPassword.length < 8) {
      setFormError(t('settings.passwordMin'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError(t('settings.passwordMismatch'));
      return;
    }
    try {
      await onChangePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      // parent shows errorMessage
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          {t('settings.title')}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {t('settings.subtitle')}
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4 max-w-xl">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            {t('settings.signedInAs')}
          </label>
          <input
            type="text"
            readOnly
            value={`${authUser.nome} (${authUser.email})`}
            className="w-full border border-slate-200 p-2 rounded-md bg-slate-50 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            {t('settings.role')}
          </label>
          <input
            type="text"
            readOnly
            value={labelRole(t, authUser.role)}
            className="w-full border border-slate-200 p-2 rounded-md bg-slate-50 text-sm"
          />
        </div>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4 max-w-xl"
      >
        <h2 className="text-lg font-bold text-slate-900">{t('settings.changePassword')}</h2>
        {(formError || errorMessage) && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {formError || errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            {t('settings.currentPassword')}
          </label>
          <input
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            {t('settings.newPassword')}
          </label>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            {t('settings.confirmPassword')}
          </label>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-md font-semibold text-sm disabled:opacity-60"
        >
          {isSubmitting ? t('common.saving') : t('settings.updatePassword')}
        </button>
      </form>
    </div>
  );
};
