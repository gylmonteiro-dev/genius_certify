import React, { useState } from 'react';
import { InstituicaoCreatePayload } from '../lib/instituicoes';

interface RegisterInstitutionViewProps {
  onSubmit: (payload: InstituicaoCreatePayload) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

export const RegisterInstitutionView: React.FC<RegisterInstitutionViewProps> = ({
  onSubmit,
  onCancel,
  isSubmitting = false,
  errorMessage = null,
}) => {
  const [instName, setInstName] = useState('');
  const [codigo, setCodigo] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [address, setAddress] = useState('');

  const [respName, setRespName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cnpjDigits = cnpj.replace(/\D/g, '');
    if (!instName.trim() || !codigo.trim() || !respName.trim() || !email.trim()) {
      setFormError('Fill in institution name, code, responsible name, and email.');
      return;
    }
    if (cnpjDigits.length !== 14) {
      setFormError('CNPJ must contain 14 digits.');
      return;
    }
    if (adminPassword.length < 8) {
      setFormError('Admin password must be at least 8 characters.');
      return;
    }

    await onSubmit({
      nome: instName.trim(),
      codigo: codigo.trim(),
      cnpj: cnpjDigits,
      responsavel: respName.trim(),
      email: email.trim(),
      endereco: address.trim(),
      telefone: phone.trim(),
      admin_nome: respName.trim(),
      admin_email: email.trim(),
      admin_password: adminPassword,
    });
  };

  const displayError = formError || errorMessage;

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          Register New Institution
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Add a new educational institution to the certification network.
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
                Institution Details
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label
                  htmlFor="inst_name"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                >
                  Institution Name
                </label>
                <input
                  id="inst_name"
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={instName}
                  onChange={(e) => setInstName(e.target.value)}
                  placeholder="e.g., Global Tech University"
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="codigo"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                >
                  Institution Code
                </label>
                <input
                  id="codigo"
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="INST-2026-001"
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="cnpj"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                >
                  CNPJ / Tax ID
                </label>
                <input
                  id="cnpj"
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="address"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                >
                  Full Address
                </label>
                <input
                  id="address"
                  type="text"
                  disabled={isSubmitting}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, Number, City, State, ZIP"
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
              <span className="material-symbols-outlined text-blue-600">
                person
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                Responsible User
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label
                  htmlFor="resp_name"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                >
                  Full Name
                </label>
                <input
                  id="resp_name"
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={respName}
                  onChange={(e) => setRespName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  disabled={isSubmitting}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane.doe@institution.edu"
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                >
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  disabled={isSubmitting}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+55 (11) 00000-0000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="admin_password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                >
                  Admin Password
                </label>
                <input
                  id="admin_password"
                  type="password"
                  required
                  minLength={8}
                  disabled={isSubmitting}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Creates the institution admin account with this email and password.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 mt-8">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-md border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm active:scale-[0.98] disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isSubmitting ? 'progress_activity' : 'save'}
              </span>
              {isSubmitting ? 'Saving...' : 'Register Institution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
