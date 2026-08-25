import React, { useMemo, useState } from 'react';
import { EventItem, Participant } from '../types';
import { InscritoApi } from '../lib/cursos';
import { formatCpf } from '../lib/cpf';
import { mapParticipanteStatus } from '../lib/participantes';
import { formatDisplayDate, labelEventStatus, labelStudentStatus, useT } from '../i18n';

const ENROLL_LOTE_MAX = 200;

interface EventIssueViewProps {
  event: EventItem;
  inscritos: InscritoApi[];
  participants?: Participant[];
  isLoading?: boolean;
  errorMessage?: string | null;
  isReleasing?: boolean;
  isIssuing?: boolean;
  isEnrolling?: boolean;
  onBack: () => void;
  onRelease: () => Promise<void>;
  onIssueSelected: (participanteIds: string[]) => Promise<void>;
  onEnrollSelected?: (participanteIds: string[]) => Promise<void>;
  onSetStatus?: (id: string, status: 'verified' | 'rejected') => Promise<void>;
  onRemoveInscrito?: (participanteId: string, revogarCertificado: boolean) => Promise<void>;
}

function canIssueOnEvent(event: EventItem): boolean {
  if (event.status === 'Draft') return false;
  if (!event.exigirConclusaoParaEmitir) return true;
  return event.status === 'Completed' && event.emissaoLiberada;
}

export const EventIssueView: React.FC<EventIssueViewProps> = ({
  event,
  inscritos,
  participants = [],
  isLoading = false,
  errorMessage = null,
  isReleasing = false,
  isIssuing = false,
  isEnrolling = false,
  onBack,
  onRelease,
  onIssueSelected,
  onEnrollSelected,
  onSetStatus,
  onRemoveInscrito,
}) => {
  const { t, dateLocale } = useT();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formError, setFormError] = useState<string | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<InscritoApi | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set());
  const [pickerError, setPickerError] = useState<string | null>(null);

  const eligible = useMemo(
    () => inscritos.filter((item) => !item.ja_emitido && item.status === 'verified'),
    [inscritos],
  );
  const issuedCount = inscritos.length - eligible.length;
  const issuanceOpen = canIssueOnEvent(event);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllEligible = () => {
    if (selected.size === eligible.length) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(eligible.map((item) => item.id)));
  };

  const enrolledIds = useMemo(
    () => new Set(inscritos.map((item) => item.id)),
    [inscritos],
  );
  const availableToEnroll = useMemo(
    () =>
      participants.filter(
        (item) =>
          item.instituicaoId === event.institutionId && !enrolledIds.has(item.id),
      ),
    [participants, event.institutionId, enrolledIds],
  );
  const filteredAvailable = useMemo(() => {
    const term = pickerSearch.trim().toLowerCase();
    if (!term) return availableToEnroll;
    return availableToEnroll.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term) ||
        item.documentId.toLowerCase().includes(term),
    );
  }, [availableToEnroll, pickerSearch]);

  const handleIssue = async () => {
    setFormError(null);
    if (selected.size === 0) {
      setFormError(t('eventIssue.selectStudents'));
      return;
    }
    await onIssueSelected([...selected]);
    setSelected(new Set());
  };

  const closeEnrollModal = () => {
    setShowEnrollModal(false);
    setPickerSearch('');
    setPickerSelected(new Set());
    setPickerError(null);
  };

  const togglePicker = (id: string) => {
    setPickerSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllAvailable = () => {
    if (pickerSelected.size === filteredAvailable.length) {
      setPickerSelected(new Set());
      return;
    }
    setPickerSelected(new Set(filteredAvailable.map((item) => item.id)));
  };

  const handleEnroll = async () => {
    if (!onEnrollSelected) return;
    setPickerError(null);
    if (pickerSelected.size === 0) {
      setPickerError(t('eventIssue.enrollSelect'));
      return;
    }
    if (pickerSelected.size > ENROLL_LOTE_MAX) {
      setPickerError(t('eventIssue.enrollTooMany'));
      return;
    }
    await onEnrollSelected([...pickerSelected]);
    closeEnrollModal();
  };

  const showActions = Boolean(onSetStatus || onRemoveInscrito);

  const handleConfirmRemove = async (revogarCertificado: boolean) => {
    if (!onRemoveInscrito || !confirmTarget) return;
    setFormError(null);
    setRemovingId(confirmTarget.id);
    try {
      await onRemoveInscrito(confirmTarget.id, revogarCertificado);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(confirmTarget.id);
        return next;
      });
      setConfirmTarget(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('errors.removeEnrollment'));
    } finally {
      setRemovingId(null);
    }
  };

  const gateMessage = (() => {
    if (event.status === 'Draft') return t('eventIssue.blockedDraft');
    if (!event.exigirConclusaoParaEmitir) return t('eventIssue.gateOff');
    if (event.status !== 'Completed') return t('eventIssue.blockedNotCompleted');
    if (!event.emissaoLiberada) return t('eventIssue.blockedNotReleased');
    return t('eventIssue.ready');
  })();

  const showRelease =
    event.exigirConclusaoParaEmitir &&
    event.status === 'Completed' &&
    !event.emissaoLiberada;

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        {t('eventIssue.back')}
      </button>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
              {t('eventIssue.kicker')}
            </p>
            <h1 className="text-2xl font-bold text-slate-900">{event.title}</h1>
            <p className="text-sm text-slate-500 mt-1">{event.institutionName}</p>
            <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-3">
              <span>{labelEventStatus(t, event.status)}</span>
              <span>{formatDisplayDate(event.date, dateLocale, event.date)}</span>
              <span>{event.durationHours}h</span>
              <span>{event.instructor || '—'}</span>
            </div>
          </div>
          {showRelease && (
            <button
              type="button"
              disabled={isReleasing}
              onClick={() => void onRelease()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold disabled:opacity-60"
            >
              {isReleasing ? t('eventIssue.releasing') : t('eventIssue.release')}
            </button>
          )}
        </div>

        <div
          className={`mt-4 rounded-md border px-4 py-3 text-sm ${
            issuanceOpen
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}
        >
          {gateMessage}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between gap-3 bg-slate-50/80">
          <div>
            <h2 className="text-sm font-bold text-slate-900">{t('eventIssue.enrolledTitle')}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('eventIssue.enrolledCount', {
                total: inscritos.length,
                issued: issuedCount,
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onEnrollSelected && (
              <button
                type="button"
                onClick={() => setShowEnrollModal(true)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold"
              >
                {t('eventIssue.enrollParticipants')}
              </button>
            )}
            <button
              type="button"
              disabled={!issuanceOpen || isIssuing || selected.size === 0}
              onClick={() => void handleIssue()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold disabled:opacity-50"
            >
              {isIssuing
                ? t('eventIssue.issuing')
                : t('eventIssue.issueSelected', { count: selected.size })}
            </button>
          </div>
        </div>

        {(formError || errorMessage) && (
          <div className="m-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {formError || errorMessage}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <span className="material-symbols-outlined animate-spin text-blue-600">
              progress_activity
            </span>
            {t('eventIssue.loading')}
          </div>
        )}

        {!isLoading && inscritos.length === 0 && (
          <div className="py-16 text-center text-sm text-slate-500">
            {t('eventIssue.empty')}
          </div>
        )}

        {!isLoading && inscritos.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={eligible.length > 0 && selected.size === eligible.length}
                      disabled={!issuanceOpen || eligible.length === 0}
                      onChange={toggleAllEligible}
                    />
                  </th>
                  <th className="px-4 py-3 text-left">{t('eventIssue.colStudent')}</th>
                  <th className="px-4 py-3 text-left">{t('common.email')}</th>
                  <th className="px-4 py-3 text-left">{t('eventIssue.colDocument')}</th>
                  <th className="px-4 py-3 text-left">{t('common.status')}</th>
                  <th className="px-4 py-3 text-left">{t('eventIssue.colCertificate')}</th>
                  {showActions && (
                    <th className="px-4 py-3 text-left">{t('common.actions')}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inscritos.map((item) => {
                  const canSelect = issuanceOpen && !item.ja_emitido && item.status === 'verified';
                  return (
                  <tr key={item.id} className="text-slate-700">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        disabled={!canSelect}
                        checked={selected.has(item.id)}
                        onChange={() => toggle(item.id)}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.nome}</td>
                    <td className="px-4 py-3">{item.email}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatCpf(item.documento)}</td>
                    <td className="px-4 py-3">
                      {labelStudentStatus(t, mapParticipanteStatus(item.status))}
                    </td>
                    <td className="px-4 py-3">
                      {item.ja_emitido ? (
                        <span className="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                          {item.numero_certificado ?? t('eventIssue.issued')}
                        </span>
                      ) : item.status !== 'verified' ? (
                        <span className="text-xs text-slate-400">{t('eventIssue.notEligible')}</span>
                      ) : (
                        <span className="text-xs text-slate-400">{t('eventIssue.pendingIssue')}</span>
                      )}
                    </td>
                    {showActions && (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {onSetStatus && item.status !== 'verified' && (
                            <button
                              type="button"
                              onClick={() => void onSetStatus(item.id, 'verified')}
                              className="px-2.5 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-semibold hover:bg-emerald-100"
                            >
                              {t('students.approve')}
                            </button>
                          )}
                          {onSetStatus && item.status !== 'rejected' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelected((prev) => {
                                  const next = new Set(prev);
                                  next.delete(item.id);
                                  return next;
                                });
                                void onSetStatus(item.id, 'rejected');
                              }}
                              className="px-2.5 py-1 rounded-md border border-rose-200 bg-rose-50 text-rose-700 text-[11px] font-semibold hover:bg-rose-100"
                            >
                              {t('students.reject')}
                            </button>
                          )}
                          {onRemoveInscrito && (
                            <button
                              type="button"
                              disabled={removingId === item.id}
                              onClick={() => setConfirmTarget(item)}
                              className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 text-[11px] font-semibold hover:bg-slate-50 disabled:opacity-60"
                            >
                              {removingId === item.id
                                ? t('common.loading')
                                : t('eventIssue.removeEnrollment')}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmTarget && onRemoveInscrito && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-md p-5 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {t('eventIssue.removeTitle')}
            </h3>
            <p className="text-sm text-slate-600">
              {confirmTarget.ja_emitido
                ? t('eventIssue.removeIssuedHint', { name: confirmTarget.nome })
                : t('eventIssue.removeHint', { name: confirmTarget.nome })}
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                disabled={removingId !== null}
                onClick={() => setConfirmTarget(null)}
                className="px-4 py-2 rounded-md border border-slate-200 text-sm font-semibold"
              >
                {t('common.cancel')}
              </button>
              {confirmTarget.ja_emitido ? (
                <>
                  <button
                    type="button"
                    disabled={removingId !== null}
                    onClick={() => void handleConfirmRemove(false)}
                    className="px-4 py-2 rounded-md border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {t('eventIssue.removeKeepCertificate')}
                  </button>
                  <button
                    type="button"
                    disabled={removingId !== null}
                    onClick={() => void handleConfirmRemove(true)}
                    className="px-4 py-2 rounded-md bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-60"
                  >
                    {t('eventIssue.removeRevokeCertificate')}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={removingId !== null}
                  onClick={() => void handleConfirmRemove(false)}
                  className="px-4 py-2 rounded-md bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-60"
                >
                  {t('eventIssue.removeConfirm')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showEnrollModal && onEnrollSelected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">
                {t('eventIssue.enrollModalTitle')}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {t('eventIssue.enrollModalHint')}
              </p>
              <input
                type="text"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder={t('eventIssue.enrollSearch')}
                className="mt-3 w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm"
              />
            </div>
            {pickerError && (
              <div className="mx-5 mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {pickerError}
              </div>
            )}
            <div className="flex-1 overflow-y-auto">
              {availableToEnroll.length === 0 && (
                <div className="py-12 text-center text-sm text-slate-500">
                  {t('eventIssue.enrollEmpty')}
                </div>
              )}
              {availableToEnroll.length > 0 && filteredAvailable.length === 0 && (
                <div className="py-12 text-center text-sm text-slate-500">
                  {t('eventIssue.enrollNoMatch')}
                </div>
              )}
              {filteredAvailable.length > 0 && (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-widest text-slate-400 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left w-10">
                        <input
                          type="checkbox"
                          checked={
                            filteredAvailable.length > 0 &&
                            pickerSelected.size === filteredAvailable.length
                          }
                          onChange={toggleAllAvailable}
                        />
                      </th>
                      <th className="px-4 py-3 text-left">{t('eventIssue.colStudent')}</th>
                      <th className="px-4 py-3 text-left">{t('common.email')}</th>
                      <th className="px-4 py-3 text-left">{t('eventIssue.colDocument')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAvailable.map((item) => (
                      <tr key={item.id} className="text-slate-700">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={pickerSelected.has(item.id)}
                            onChange={() => togglePicker(item.id)}
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                        <td className="px-4 py-3">{item.email}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatCpf(item.documentId)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEnrollModal}
                className="px-4 py-2 rounded-md border border-slate-200 text-sm font-semibold"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={isEnrolling || pickerSelected.size === 0}
                onClick={() => void handleEnroll()}
                className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold disabled:opacity-60"
              >
                {isEnrolling
                  ? t('eventIssue.enrolling')
                  : t('eventIssue.enrollConfirm', { count: pickerSelected.size })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
