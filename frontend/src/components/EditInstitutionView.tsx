import React, { useState } from 'react';
import { Institution } from '../types';
import { ApiError } from '../lib/api';
import {
  INSTITUICAO_LOGO_TYPES,
  InstituicaoUpdatePayload,
  MAX_INSTITUICAO_LOGO_BYTES,
} from '../lib/instituicoes';
import { useT } from '../i18n';

interface EditInstitutionViewProps {
  institution: Institution;
  onSubmit: (payload: InstituicaoUpdatePayload) => Promise<void>;
  onUploadLogo: (file: File) => Promise<void>;
  onCancel: () => void;
  canChangeAdmin?: boolean;
  isSubmitting?: boolean;
  isUploadingLogo?: boolean;
  errorMessage?: string | null;
}

export const EditInstitutionView: React.FC<EditInstitutionViewProps> = ({
  institution,
  onSubmit,
  onUploadLogo,
  onCancel,
  canChangeAdmin = false,
  isSubmitting = false,
  isUploadingLogo = false,
  errorMessage = null,
}) => {
  const { t } = useT();
  const [instName, setInstName] = useState(institution.name);
  const [codigo, setCodigo] = useState(institution.code);
  const [cnpj, setCnpj] = useState(institution.cnpjTaxId);
  const [address, setAddress] = useState(
    institution.address === '—' ? '' : institution.address,
  );
  const [respName, setRespName] = useState(institution.responsiblePerson);
  const [email, setEmail] = useState(institution.email);
  const [phone, setPhone] = useState(
    institution.phone === '—' ? '' : institution.phone,
  );
  const [adminNome, setAdminNome] = useState(
    institution.adminNome || institution.responsiblePerson,
  );
  const [adminEmail, setAdminEmail] = useState(institution.adminEmail || '');
  const [adminPassword, setAdminPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const busy = isSubmitting || isUploadingLogo;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cnpjDigits = cnpj.replace(/\D/g, '');
    if (!instName.trim() || !codigo.trim() || !respName.trim() || !email.trim()) {
      setFormError(t('editInstitution.fillRequired'));
      return;
    }
    if (cnpjDigits.length !== 14) {
      setFormError(t('registerInstitution.cnpjInvalid'));
      return;
    }

    const payload: InstituicaoUpdatePayload = {
      nome: instName.trim(),
      codigo: codigo.trim(),
      cnpj: cnpjDigits,
      responsavel: respName.trim(),
      email: email.trim(),
      endereco: address.trim(),
      telefone: phone.trim(),
    };

    if (canChangeAdmin) {
      const nextAdminNome = adminNome.trim();
      const nextAdminEmail = adminEmail.trim();
      if (!nextAdminNome || !nextAdminEmail) {
        setFormError(t('editInstitution.adminRequired'));
        return;
      }
      if (adminPassword && adminPassword.length < 8) {
        setFormError(t('editInstitution.adminPasswordMin'));
        return;
      }
      if (!institution.adminEmail && !adminPassword) {
        setFormError(t('editInstitution.adminPasswordMin'));
        return;
      }
      payload.admin_nome = nextAdminNome;
      payload.admin_email = nextAdminEmail;
      if (adminPassword) {
        payload.admin_password = adminPassword;
      }
    }

    await onSubmit(payload);
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setLogoError(null);
    if (!INSTITUICAO_LOGO_TYPES.includes(file.type as (typeof INSTITUICAO_LOGO_TYPES)[number])) {
      setLogoError(t('editInstitution.logoType'));
      return;
    }
    if (file.size > MAX_INSTITUICAO_LOGO_BYTES) {
      setLogoError(t('editInstitution.logoTooLarge'));
      return;
    }

    try {
      await onUploadLogo(file);
    } catch (err) {
      setLogoError(
        err instanceof ApiError ? err.message : t('errors.uploadInstitutionLogo'),
      );
    }
  };

  const displayError = formError || errorMessage || logoError;

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          {t('editInstitution.title')}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {t('editInstitution.subtitle')}
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-sm max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          {displayError && (
            <div
              role="alert"
              className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              {displayError}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
              <span className="material-symbols-outlined text-blue-600">
                account_balance
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                {t('registerInstitution.details')}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label
                  htmlFor="edit_inst_name"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                >
                  {t('registerInstitution.name')}
                </label>
                <input
                  id="edit_inst_name"
                  type="text"
                  required
                  disabled={busy}
                  value={instName}
                  onChange={(e) => setInstName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="edit_codigo"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                >
                  {t('registerInstitution.code')}
                </label>
                <input
                  id="edit_codigo"
                  type="text"
                  required
                  disabled={busy}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
                />
                <p className="mt-1 text-xs text-slate-400">
                  {t('registerInstitution.codeHint')}
                </p>
              </div>

              <div>
                <label
                  htmlFor="edit_cnpj"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                >
                  {t('institutions.cnpj')}
                </label>
                <input
                  id="edit_cnpj"
                  type="text"
                  required
                  disabled={busy}
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="edit_address"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                >
                  {t('registerInstitution.address')}
                </label>
                <input
                  id="edit_address"
                  type="text"
                  disabled={busy}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
              <span className="material-symbols-outlined text-blue-600">image</span>
              <h2 className="text-lg font-bold text-slate-900">
                {t('editInstitution.logo')}
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {institution.logoUrl ? (
                <img
                  src={institution.logoUrl}
                  alt={institution.name}
                  className="h-16 w-16 rounded-lg object-contain border border-slate-200 bg-slate-50 p-1"
                />
              ) : (
                <div
                  className={`w-16 h-16 rounded-lg font-bold text-sm flex items-center justify-center shrink-0 ${
                    institution.bgColor || 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {institution.logoLetter}
                </div>
              )}
              <div>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
                  <span className="material-symbols-outlined text-[18px]">
                    {isUploadingLogo ? 'progress_activity' : 'upload'}
                  </span>
                  {isUploadingLogo
                    ? t('editInstitution.uploadingLogo')
                    : t('editInstitution.uploadLogo')}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    disabled={busy}
                    onChange={(e) => void handleLogoChange(e)}
                  />
                </label>
                <p className="mt-1 text-xs text-slate-400">
                  {t('editInstitution.logoHint')}
                </p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
              <span className="material-symbols-outlined text-blue-600">person</span>
              <h2 className="text-lg font-bold text-slate-900">
                {t('registerInstitution.responsible')}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label
                  htmlFor="edit_resp_name"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                >
                  {t('common.fullName')}
                </label>
                <input
                  id="edit_resp_name"
                  type="text"
                  required
                  disabled={busy}
                  value={respName}
                  onChange={(e) => setRespName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="edit_email"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                >
                  {t('registerInstitution.email')}
                </label>
                <input
                  id="edit_email"
                  type="email"
                  required
                  disabled={busy}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="edit_phone"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                >
                  {t('registerInstitution.phone')}
                </label>
                <input
                  id="edit_phone"
                  type="tel"
                  disabled={busy}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          {canChangeAdmin && (
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                <span className="material-symbols-outlined text-blue-600">
                  admin_panel_settings
                </span>
                <h2 className="text-lg font-bold text-slate-900">
                  {t('editInstitution.adminAccess')}
                </h2>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                {t('editInstitution.adminAccessHint')}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label
                    htmlFor="edit_admin_nome"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                  >
                    {t('editInstitution.adminName')}
                  </label>
                  <input
                    id="edit_admin_nome"
                    type="text"
                    required
                    disabled={busy}
                    value={adminNome}
                    onChange={(e) => setAdminNome(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit_admin_email"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                  >
                    {t('editInstitution.adminEmail')}
                  </label>
                  <input
                    id="edit_admin_email"
                    type="email"
                    required
                    disabled={busy}
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="edit_admin_password"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                  >
                    {t('editInstitution.adminPassword')}
                  </label>
                  <input
                    id="edit_admin_password"
                    type="password"
                    minLength={8}
                    disabled={busy}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder={t('registerInstitution.passwordPlaceholder')}
                    autoComplete="new-password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    {t('editInstitution.adminPasswordHint')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 mt-8">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="px-4 py-2 rounded-md border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-60"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm active:scale-[0.98] disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isSubmitting ? 'progress_activity' : 'save'}
              </span>
              {isSubmitting ? t('common.saving') : t('editInstitution.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
