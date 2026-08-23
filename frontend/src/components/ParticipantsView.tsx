import React, { useState } from 'react';
import { Institution, Participant } from '../types';

function statusBadgeClass(status: Participant['status']): string {
  if (status === 'Verified') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'Rejected') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}
import {
  ParticipanteApi,
  ParticipanteCreatePayload,
  ParticipanteDetalheApi,
  ParticipanteImportResult,
  ParticipanteUpdatePayload,
} from '../lib/participantes';
import { digitsOnly, formatCpf, isValidCpf } from '../lib/cpf';
import { ApiError } from '../lib/api';
import { formatDisplayDate, labelEventStatus, labelStudentStatus, useT } from '../i18n';

interface ParticipantsViewProps {
  participants: Participant[];
  institutions: Institution[];
  isSuperAdmin: boolean;
  isLoading?: boolean;
  errorMessage?: string | null;
  isSubmitting?: boolean;
  submitError?: string | null;
  onCreate: (payload: ParticipanteCreatePayload) => Promise<void>;
  onUpdate?: (id: string, payload: ParticipanteUpdatePayload) => Promise<ParticipanteApi>;
  onImportCsv?: (file: File, instituicaoId?: string) => Promise<ParticipanteImportResult>;
  onLoadByCpf?: (cpf: string, instituicaoId?: string) => Promise<ParticipanteDetalheApi>;
  onSetStatus?: (id: string, status: 'verified' | 'rejected') => Promise<void>;
  isImporting?: boolean;
}

export const ParticipantsView: React.FC<ParticipantsViewProps> = ({
  participants,
  institutions,
  isSuperAdmin,
  isLoading = false,
  errorMessage = null,
  isSubmitting = false,
  submitError = null,
  onCreate,
  onUpdate,
  onImportCsv,
  onLoadByCpf,
  onSetStatus,
  isImporting = false,
}) => {
  const { t, dateLocale } = useT();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [documento, setDocumento] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [instituicaoId, setInstituicaoId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [importInstituicaoId, setImportInstituicaoId] = useState('');
  const [importResult, setImportResult] = useState<ParticipanteImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ParticipanteDetalheApi | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailBirthDate, setDetailBirthDate] = useState('');
  const [savingBirthDate, setSavingBirthDate] = useState(false);

  const filtered = participants.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.documentId.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const resetForm = () => {
    setNome('');
    setEmail('');
    setDocumento('');
    setDataNascimento('');
    setInstituicaoId('');
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!nome.trim() || !email.trim() || !dataNascimento) {
      setFormError(t('students.fillRequired'));
      return;
    }
    if (!isValidCpf(documento)) {
      setFormError(t('students.cpfInvalid'));
      return;
    }
    if (isSuperAdmin && !instituicaoId) {
      setFormError(t('students.selectInstitution'));
      return;
    }
    const payload: ParticipanteCreatePayload = {
      nome: nome.trim(),
      email: email.trim(),
      documento: digitsOnly(documento),
      data_nascimento: dataNascimento,
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
            {t('students.title')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('students.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onImportCsv && (
            <label className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-md font-semibold text-sm transition-colors flex items-center gap-2 shadow-sm cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              {isImporting ? t('students.importing') : t('students.importCsv')}
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                disabled={isImporting}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  void (async () => {
                    setImportError(null);
                    setImportResult(null);
                    if (isSuperAdmin && !importInstituicaoId) {
                      setImportError(t('students.csvNeedInstitution'));
                      return;
                    }
                    try {
                      const result = await onImportCsv(
                        file,
                        isSuperAdmin ? importInstituicaoId : undefined,
                      );
                      setImportResult(result);
                    } catch (err) {
                      setImportError(
                        err instanceof ApiError
                          ? err.message
                          : t('errors.importCsv'),
                      );
                    }
                  })();
                }}
              />
            </label>
          )}
          <button
            onClick={() => setShowForm((open) => !open)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-md font-semibold text-sm transition-colors flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            {t('students.add')}
          </button>
        </div>
      </div>

      {onImportCsv && isSuperAdmin && (
        <div className="max-w-md">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            {t('students.csvInstitution')}
          </label>
          <select
            value={importInstituicaoId}
            onChange={(e) => setImportInstituicaoId(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm"
          >
            <option value="">{t('common.selectInstitution')}</option>
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.code ? `${inst.name} (${inst.code})` : inst.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {(importError || importResult) && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            importError
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {importError ||
            (importResult &&
              t('students.imported', {
                created: importResult.created,
                reused: importResult.reused,
                skipped: importResult.skipped,
              }))}
          {importResult && importResult.errors.length > 0 && (
            <ul className="mt-2 text-xs space-y-0.5">
              {importResult.errors.slice(0, 8).map((err) => (
                <li key={`${err.linha}-${err.mensagem}`}>
                  {t('students.lineError', { line: err.linha, message: err.mensagem })}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

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
                {t('common.institution')}
              </label>
              <select
                value={instituicaoId}
                onChange={(e) => setInstituicaoId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm"
              >
                <option value="">{t('common.selectInstitution')}</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.code ? `${inst.name} (${inst.code})` : inst.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                {t('common.fullName')}
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
                {t('common.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                {t('students.document')}
              </label>
              <input
                value={documento}
                onChange={(e) => setDocumento(formatCpf(e.target.value))}
                placeholder={t('students.documentPlaceholder')}
                inputMode="numeric"
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">{t('students.documentHint')}</p>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                {t('common.birthDate')}
              </label>
              <input
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">{t('students.birthDateHint')}</p>
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
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold disabled:opacity-60"
            >
              {isSubmitting ? t('common.saving') : t('students.save')}
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
            placeholder={t('students.searchPlaceholder')}
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
            {t('students.loading')}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-slate-500">
            {participants.length === 0
              ? t('students.empty')
              : t('students.noMatch')}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-xs font-bold tracking-wider text-slate-500 uppercase">
                  <th className="py-3.5 px-5">{t('students.colName')}</th>
                  <th className="py-3.5 px-5">{t('students.colDocument')}</th>
                  <th className="py-3.5 px-5">{t('students.colInstitution')}</th>
                  <th className="py-3.5 px-5 text-center">{t('students.colCertificates')}</th>
                  <th className="py-3.5 px-5">{t('students.colJoined')}</th>
                  <th className="py-3.5 px-5">{t('students.colStatus')}</th>
                  {onSetStatus && (
                    <th className="py-3.5 px-5">{t('common.actions')}</th>
                  )}
                </tr>
              </thead>
              <tbody className="text-sm">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className={`border-b border-slate-100 hover:bg-slate-50/80 transition-colors ${
                      onLoadByCpf ? 'cursor-pointer' : ''
                    } ${selectedId === item.id ? 'bg-blue-50/70' : ''}`}
                    onClick={() => {
                      if (!onLoadByCpf) return;
                      setSelectedId(item.id);
                      setDetailError(null);
                      setDetailBirthDate('');
                      setDetailLoading(true);
                      void onLoadByCpf(
                        item.documentId,
                        isSuperAdmin ? item.instituicaoId : undefined,
                      )
                        .then((result) => setDetail(result))
                        .catch((err) => {
                          setDetail(null);
                          setDetailError(
                            err instanceof ApiError
                              ? err.message
                              : t('students.loadEventsError'),
                          );
                        })
                        .finally(() => setDetailLoading(false));
                    }}
                  >
                    <td className="py-4 px-5 font-semibold text-slate-900">
                      {item.name}
                      <span className="block text-xs font-normal text-slate-400">{item.email}</span>
                    </td>
                    <td className="py-4 px-5 font-mono text-xs text-slate-500">
                      {formatCpf(item.documentId)}
                    </td>
                    <td className="py-4 px-5 text-slate-800 font-medium">{item.institution}</td>
                    <td className="py-4 px-5 text-center font-bold text-blue-600">
                      {item.certificatesCount}
                    </td>
                    <td className="py-4 px-5 text-slate-500 text-xs">{item.joinedDate}</td>
                    <td className="py-4 px-5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadgeClass(item.status)}`}
                      >
                        {labelStudentStatus(t, item.status)}
                      </span>
                    </td>
                    {onSetStatus && (
                      <td className="py-4 px-5">
                        <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {item.status !== 'Verified' && (
                            <button
                              type="button"
                              onClick={() => void onSetStatus(item.id, 'verified')}
                              className="px-2.5 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-semibold hover:bg-emerald-100"
                            >
                              {t('students.approve')}
                            </button>
                          )}
                          {item.status !== 'Rejected' && (
                            <button
                              type="button"
                              onClick={() => void onSetStatus(item.id, 'rejected')}
                              className="px-2.5 py-1 rounded-md border border-rose-200 bg-rose-50 text-rose-700 text-[11px] font-semibold hover:bg-rose-100"
                            >
                              {t('students.reject')}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {onLoadByCpf && selectedId && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 bg-slate-50/80">
            <h2 className="text-sm font-bold text-slate-900">{t('students.eventsTitle')}</h2>
            {detail && (
              <p className="text-xs text-slate-500 mt-0.5">
                {detail.nome} · {formatCpf(detail.documento)}
                {detail.data_nascimento
                  ? ` · ${formatDisplayDate(detail.data_nascimento, dateLocale, detail.data_nascimento)}`
                  : ''}
              </p>
            )}
          </div>
          {detail && onUpdate && !detail.data_nascimento && (
            <form
              className="px-4 pt-4 flex flex-col sm:flex-row sm:items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!detailBirthDate || savingBirthDate) return;
                setSavingBirthDate(true);
                setDetailError(null);
                void onUpdate(detail.id, { data_nascimento: detailBirthDate })
                  .then((updated) => {
                    setDetail({ ...detail, data_nascimento: updated.data_nascimento });
                    setDetailBirthDate('');
                  })
                  .catch((err) => {
                    setDetailError(
                      err instanceof ApiError
                        ? err.message
                        : t('errors.updateStudent'),
                    );
                  })
                  .finally(() => setSavingBirthDate(false));
              }}
            >
              <div className="flex-1 max-w-xs">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  {t('common.birthDate')}
                </label>
                <input
                  type="date"
                  value={detailBirthDate}
                  onChange={(e) => setDetailBirthDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  {t('students.birthDateMissing')}
                </p>
              </div>
              <button
                type="submit"
                disabled={savingBirthDate || !detailBirthDate}
                className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold disabled:opacity-60"
              >
                {savingBirthDate ? t('common.saving') : t('students.saveBirthDate')}
              </button>
            </form>
          )}
          {detailError && (
            <div className="m-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {detailError}
            </div>
          )}
          {detailLoading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <span className="material-symbols-outlined animate-spin text-blue-600">
                progress_activity
              </span>
              {t('students.loadingEvents')}
            </div>
          )}
          {!detailLoading && detail && detail.eventos.length === 0 && (
            <div className="py-10 text-center text-sm text-slate-500">
              {t('students.eventsEmpty')}
            </div>
          )}
          {!detailLoading && detail && detail.eventos.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-xs font-bold tracking-wider text-slate-500 uppercase">
                    <th className="py-3 px-5">{t('students.colEvent')}</th>
                    <th className="py-3 px-5">{t('common.date')}</th>
                    <th className="py-3 px-5">{t('common.status')}</th>
                    <th className="py-3 px-5">{t('students.colEnrolledAt')}</th>
                    <th className="py-3 px-5">{t('eventIssue.colCertificate')}</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {detail.eventos.map((evento) => (
                    <tr key={evento.curso_id} className="border-b border-slate-100">
                      <td className="py-3 px-5 font-medium text-slate-900">
                        {evento.curso_titulo}
                      </td>
                      <td className="py-3 px-5 text-slate-500 text-xs">
                        {evento.data_evento
                          ? formatDisplayDate(evento.data_evento, dateLocale, evento.data_evento)
                          : '—'}
                      </td>
                      <td className="py-3 px-5 text-slate-600">
                        {labelEventStatus(
                          t,
                          evento.curso_status === 'completed'
                            ? 'Completed'
                            : evento.curso_status === 'draft'
                              ? 'Draft'
                              : 'Upcoming',
                        )}
                      </td>
                      <td className="py-3 px-5 text-slate-500 text-xs">
                        {evento.inscrito_em.slice(0, 10)}
                      </td>
                      <td className="py-3 px-5">
                        {evento.ja_emitido ? (
                          <span className="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                            {evento.numero_certificado ?? t('eventIssue.issued')}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {t('eventIssue.pendingIssue')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
