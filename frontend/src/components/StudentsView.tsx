import React, { useState } from 'react';
import { Institution, Student } from '../types';
import { AlunoCreatePayload } from '../lib/alunos';

interface StudentsViewProps {
  students: Student[];
  institutions: Institution[];
  isSuperAdmin: boolean;
  isLoading?: boolean;
  errorMessage?: string | null;
  isSubmitting?: boolean;
  submitError?: string | null;
  onCreate: (payload: AlunoCreatePayload) => Promise<void>;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  institutions,
  isSuperAdmin,
  isLoading = false,
  errorMessage = null,
  isSubmitting = false,
  submitError = null,
  onCreate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [documento, setDocumento] = useState('');
  const [instituicaoId, setInstituicaoId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.documentId.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const resetForm = () => {
    setNome('');
    setEmail('');
    setDocumento('');
    setInstituicaoId('');
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!nome.trim() || !email.trim() || documento.trim().length < 5) {
      setFormError('Fill name, email, and a document with at least 5 characters.');
      return;
    }
    if (isSuperAdmin && !instituicaoId) {
      setFormError('Select an institution.');
      return;
    }
    const payload: AlunoCreatePayload = {
      nome: nome.trim(),
      email: email.trim(),
      documento: documento.trim(),
    };
    if (isSuperAdmin) payload.instituicao_id = instituicaoId;
    try {
      await onCreate(payload);
      resetForm();
      setShowForm(false);
    } catch {
      // submitError is shown by the parent
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Registered Students
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Student roster loaded from the API.
          </p>
        </div>
        <button
          onClick={() => setShowForm((open) => !open)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-md font-semibold text-sm transition-colors flex items-center gap-2 shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Add Student
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4 max-w-2xl"
        >
          {(formError || submitError) && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {formError || submitError}
            </div>
          )}
          {isSuperAdmin && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Institution
              </label>
              <select
                value={instituicaoId}
                onChange={(e) => setInstituicaoId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select institution</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Full name
              </label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Document / ID
              </label>
              <input
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="CPF or student ID (min. 5 characters)"
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="px-4 py-2 rounded-md border border-slate-200 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : 'Save student'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search student by name, email, or ID..."
            className="w-full sm:w-72 bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {errorMessage && (
          <div className="m-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <span className="material-symbols-outlined animate-spin text-blue-600">
              progress_activity
            </span>
            Loading students...
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-slate-500">
            {students.length === 0
              ? 'No students registered yet.'
              : 'No students match the current search.'}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-xs font-bold tracking-wider text-slate-500 uppercase">
                  <th className="py-3.5 px-5">STUDENT NAME</th>
                  <th className="py-3.5 px-5">DOCUMENT / ID</th>
                  <th className="py-3.5 px-5">INSTITUTION</th>
                  <th className="py-3.5 px-5 text-center">CERTIFICATES</th>
                  <th className="py-3.5 px-5">JOINED DATE</th>
                  <th className="py-3.5 px-5">STATUS</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-5 font-semibold text-slate-900">
                      {s.name}
                      <span className="block text-xs font-normal text-slate-400">{s.email}</span>
                    </td>
                    <td className="py-4 px-5 font-mono text-xs text-slate-500">{s.documentId}</td>
                    <td className="py-4 px-5 text-slate-800 font-medium">{s.institution}</td>
                    <td className="py-4 px-5 text-center font-bold text-blue-600">
                      {s.certificatesCount}
                    </td>
                    <td className="py-4 px-5 text-slate-500 text-xs">{s.joinedDate}</td>
                    <td className="py-4 px-5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          s.status === 'Verified'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
