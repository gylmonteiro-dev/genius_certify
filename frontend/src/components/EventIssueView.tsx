import React, { useMemo, useState } from 'react';
import { EventItem, Participant } from '../types';
import { InscritoApi } from '../lib/cursos';
import { formatCpf } from '../lib/cpf';
import { mapParticipanteStatus } from '../lib/participantes';
import { formatDisplayDate, labelEventStatus, labelStudentStatus, useT } from '../i18n';

const ENROLL_LOTE_MAX = 200;
const JUSTIFICATIVA_MIN = 10;

interface EventIssueViewProps {
  event: EventItem;
  inscritos: InscritoApi[];
  participants?: Participant[];
  isLoading?: boolean;
  errorMessage?: string | null;
  isReleasing?: boolean;
  isIssuing?: boolean;
  isEnrolling?: boolean;
  isCancelling?: boolean;
  isBulkActing?: boolean;
  onBack: () => void;
  onRelease: () => Promise<void>;
  onIssueSelected: (participanteIds: string[]) => Promise<void>;
  onEnrollSelected?: (participanteIds: string[]) => Promise<void>;
  onSetStatus?: (id: string, status: 'verified' | 'rejected') => Promise<void>;
  onRemoveInscrito?: (participanteId: string, revogarCertificado: boolean) => Promise<void>;
  onCancelEvent?: (justificativa: string) => Promise<void>;
  onRevokeCertificatesLote?: (participanteIds: string[]) => Promise<void>;
  onCancelInscritosLote?: (
    participanteIds: string[],
    revogarCertificados: boolean,
  ) => Promise<void>;
}

function canIssueOnEvent(event: EventItem): boolean {
  if (event.status === 'Draft' || event.status === 'Cancelled') return false;
  if (!event.exigirConclusaoParaEmitir) return true;
  return event.status === 'Completed' && event.emissaoLiberada;
}

function isEnrollmentCancelled(item: InscritoApi): boolean {
  return Boolean(item.inscricao_cancelada);
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
  isCancelling = false,
  isBulkActing = false,
  onBack,
  onRelease,
  onIssueSelected,
  onEnrollSelected,
  onSetStatus,
  onRemoveInscrito,
  onCancelEvent,
  onRevokeCertificatesLote,
  onCancelInscritosLote,
}) => {
  const { t, dateLocale } = useT();
  const eventCancelled = event.status === 'Cancelled';
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formError, setFormError] = useState<string | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<InscritoApi | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set());
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [showCancelEvent, setShowCancelEvent] = useState(false);
  const [showJustification, setShowJustification] = useState(false);
  const [showBulkCancel, setShowBulkCancel] = useState(false);
  const [cancelJustification, setCancelJustification] = useState('');

  const eligible = useMemo(
    () =>
      inscritos.filter(
        (item) =>
          !item.ja_emitido &&
          item.status === 'verified' &&
          !isEnrollmentCancelled(item),
      ),
    [inscritos],
  );
  const activeEnrollments = useMemo(
    () => inscritos.filter((item) => !isEnrollmentCancelled(item)),
    [inscritos],
  );
  const withActiveCert = useMemo(
    () => inscritos.filter((item) => item.ja_emitido),
    [inscritos],
  );
  const issuedCount = inscritos.filter((item) => item.ja_emitido).length;
  const issuanceOpen = canIssueOnEvent(event);
  const selectable = eventCancelled ? [] : activeEnrollments;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllSelectable = () => {
    if (selected.size === selectable.length) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(selectable.map((item) => item.id)));
  };

  const enrolledActiveIds = useMemo(
    () => new Set(activeEnrollments.map((item) => item.id)),
    [activeEnrollments],
  );
  const availableToEnroll = useMemo(
    () =>
      participants.filter(
        (item) =>
          item.instituicaoId === event.institutionId && !enrolledActiveIds.has(item.id),
      ),
    [participants, event.institutionId, enrolledActiveIds],
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

  const selectedEligible = useMemo(
    () => eligible.filter((item) => selected.has(item.id)),
    [eligible, selected],
  );
  const selectedWithCert = useMemo(
    () => withActiveCert.filter((item) => selected.has(item.id)),
    [withActiveCert, selected],
  );
  const selectedActive = useMemo(
    () => activeEnrollments.filter((item) => selected.has(item.id)),
    [activeEnrollments, selected],
  );

  const handleIssue = async () => {
    setFormError(null);
    if (selectedEligible.length === 0) {
      setFormError(t('eventIssue.selectStudents'));
      return;
    }
    await onIssueSelected(selectedEligible.map((item) => item.id));
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

  const showActions = Boolean(onSetStatus || onRemoveInscrito) && !eventCancelled;

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

  const openCancelEvent = () => {
    setFormError(null);
    setCancelJustification('');
    setShowCancelEvent(true);
  };

  const handleCancelEvent = async () => {
    if (!onCancelEvent) return;
    if (withActiveCert.length > 0) return;
    if (
      activeEnrollments.length > 0 &&
      cancelJustification.trim().length < JUSTIFICATIVA_MIN
    ) {
      setFormError(t('eventIssue.cancelEventJustificationHint'));
      return;
    }
    setFormError(null);
    try {
      await onCancelEvent(cancelJustification.trim());
      setShowCancelEvent(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('errors.cancelEvent'));
    }
  };

  const handleRevokeSelected = async () => {
    if (!onRevokeCertificatesLote) return;
    if (selectedWithCert.length === 0) {
      setFormError(t('eventIssue.selectForBulk'));
      return;
    }
    setFormError(null);
    try {
      await onRevokeCertificatesLote(selectedWithCert.map((item) => item.id));
      setSelected(new Set());
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('errors.revokeCertificatesBatch'));
    }
  };

  const handleRevokeAll = async () => {
    if (!onRevokeCertificatesLote) return;
    if (withActiveCert.length === 0) {
      setFormError(t('eventIssue.noActiveCertificates'));
      return;
    }
    setFormError(null);
    try {
      await onRevokeCertificatesLote([]);
      setSelected(new Set());
      setShowCancelEvent(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('errors.revokeCertificatesBatch'));
    }
  };

  const handleBulkCancel = async (revogarCertificados: boolean) => {
    if (!onCancelInscritosLote) return;
    if (selectedActive.length === 0) {
      setFormError(t('eventIssue.selectForBulk'));
      return;
    }
    setFormError(null);
    try {
      await onCancelInscritosLote(
        selectedActive.map((item) => item.id),
        revogarCertificados,
      );
      setSelected(new Set());
      setShowBulkCancel(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('errors.cancelEnrollmentsBatch'));
    }
  };

  const gateMessage = (() => {
    if (eventCancelled) return t('eventIssue.blockedCancelled');
    if (event.status === 'Draft') return t('eventIssue.blockedDraft');
    if (!event.exigirConclusaoParaEmitir) return t('eventIssue.gateOff');
    if (event.status !== 'Completed') return t('eventIssue.blockedNotCompleted');
    if (!event.emissaoLiberada) return t('eventIssue.blockedNotReleased');
    return t('eventIssue.ready');
  })();

  const showRelease =
    !eventCancelled &&
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
          <div className="flex flex-wrap items-center gap-2">
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
            {eventCancelled && event.cancelamentoJustificativa && (
              <button
                type="button"
                onClick={() => setShowJustification(true)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-md text-xs font-semibold hover:bg-slate-50"
              >
                {t('eventIssue.viewJustification')}
              </button>
            )}
            {!eventCancelled && onCancelEvent && (
              <button
                type="button"
                onClick={openCancelEvent}
                className="px-4 py-2 border border-rose-200 bg-rose-50 text-rose-700 rounded-md text-xs font-semibold hover:bg-rose-100"
              >
                {t('eventIssue.cancelEvent')}
              </button>
            )}
          </div>
        </div>

        {eventCancelled && (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {t('eventIssue.cancelledBanner')}
          </div>
        )}

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
            {onEnrollSelected && !eventCancelled && (
              <button
                type="button"
                onClick={() => setShowEnrollModal(true)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold"
              >
                {t('eventIssue.enrollParticipants')}
              </button>
            )}
            {onRevokeCertificatesLote && !eventCancelled && (
              <>
                <button
                  type="button"
                  disabled={isBulkActing || selectedWithCert.length === 0}
                  onClick={() => void handleRevokeSelected()}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold disabled:opacity-50"
                >
                  {t('eventIssue.revokeSelected')}
                </button>
                <button
                  type="button"
                  disabled={isBulkActing || withActiveCert.length === 0}
                  onClick={() => void handleRevokeAll()}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold disabled:opacity-50"
                >
                  {t('eventIssue.revokeAllActive')}
                </button>
              </>
            )}
            {onCancelInscritosLote && !eventCancelled && (
              <button
                type="button"
                disabled={isBulkActing || selectedActive.length === 0}
                onClick={() => {
                  setFormError(null);
                  setShowBulkCancel(true);
                }}
                className="px-4 py-2 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-md text-xs font-semibold disabled:opacity-50"
              >
                {t('eventIssue.cancelSelected')}
              </button>
            )}
            <button
              type="button"
              disabled={!issuanceOpen || isIssuing || selectedEligible.length === 0}
              onClick={() => void handleIssue()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold disabled:opacity-50"
            >
              {isIssuing
                ? t('eventIssue.issuing')
                : t('eventIssue.issueSelected', { count: selectedEligible.length })}
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
                      checked={selectable.length > 0 && selected.size === selectable.length}
                      disabled={selectable.length === 0}
                      onChange={toggleAllSelectable}
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
                  const cancelled = isEnrollmentCancelled(item);
                  const canSelect = !eventCancelled && !cancelled;
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
                      <div className="flex flex-wrap gap-1.5">
                        {labelStudentStatus(t, mapParticipanteStatus(item.status))}
                        {cancelled && (
                          <span className="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200">
                            {t('eventIssue.enrollmentCancelled')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {item.certificado_status === 'revoked' ? (
                        <span className="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200">
                          {t('eventIssue.certificateRevoked')}
                        </span>
                      ) : item.ja_emitido ? (
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
                          {onSetStatus && item.status !== 'verified' && !cancelled && (
                            <button
                              type="button"
                              onClick={() => void onSetStatus(item.id, 'verified')}
                              className="px-2.5 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-semibold hover:bg-emerald-100"
                            >
                              {t('students.approve')}
                            </button>
                          )}
                          {onSetStatus && item.status !== 'rejected' && !cancelled && (
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
                          {onRemoveInscrito && !cancelled && (
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

      {showCancelEvent && onCancelEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-md p-5 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {t('eventIssue.cancelEventTitle')}
            </h3>
            {withActiveCert.length > 0 ? (
              <>
                <p className="text-sm text-slate-600">{t('eventIssue.cancelEventBlockedCerts')}</p>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCancelEvent(false)}
                    className="px-4 py-2 rounded-md border border-slate-200 text-sm font-semibold"
                  >
                    {t('common.close')}
                  </button>
                  {onRevokeCertificatesLote && (
                    <button
                      type="button"
                      disabled={isBulkActing}
                      onClick={() => void handleRevokeAll()}
                      className="px-4 py-2 rounded-md bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-60"
                    >
                      {t('eventIssue.cancelEventGoRevoke')}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-600">{t('eventIssue.cancelEventHint')}</p>
                {activeEnrollments.length > 0 && (
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    {t('eventIssue.cancelEventEnrollmentsWarn')}
                  </p>
                )}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                    {t('eventIssue.cancelEventJustification')}
                  </label>
                  <textarea
                    value={cancelJustification}
                    onChange={(e) => setCancelJustification(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm"
                  />
                {activeEnrollments.length > 0 && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    {t('eventIssue.cancelEventJustificationHint')}
                  </p>
                )}
                {formError && showCancelEvent && (
                  <p className="mt-2 text-sm text-rose-700">{formError}</p>
                )}
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={() => setShowCancelEvent(false)}
                    className="px-4 py-2 rounded-md border border-slate-200 text-sm font-semibold"
                  >
                    {t('common.close')}
                  </button>
                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={() => void handleCancelEvent()}
                    className="px-4 py-2 rounded-md bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-60"
                  >
                    {isCancelling ? t('common.loading') : t('eventIssue.cancelEventConfirm')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showBulkCancel && onCancelInscritosLote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-md p-5 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {t('eventIssue.bulkCancelTitle')}
            </h3>
            <p className="text-sm text-slate-600">{t('eventIssue.bulkCancelHint')}</p>
            {selectedWithCert.length > 0 && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                {t('eventIssue.bulkCancelIssuedHint')}
              </p>
            )}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                disabled={isBulkActing}
                onClick={() => setShowBulkCancel(false)}
                className="px-4 py-2 rounded-md border border-slate-200 text-sm font-semibold"
              >
                {t('common.close')}
              </button>
              {selectedWithCert.length > 0 ? (
                <button
                  type="button"
                  disabled={isBulkActing}
                  onClick={() => void handleBulkCancel(true)}
                  className="px-4 py-2 rounded-md bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-60"
                >
                  {t('eventIssue.bulkCancelRevoke')}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isBulkActing}
                  onClick={() => void handleBulkCancel(false)}
                  className="px-4 py-2 rounded-md bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-60"
                >
                  {t('eventIssue.bulkCancelConfirm')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showJustification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-md p-5 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {t('eventIssue.justificationTitle')}
            </h3>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {event.cancelamentoJustificativa || '—'}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowJustification(false)}
                className="px-4 py-2 rounded-md border border-slate-200 text-sm font-semibold"
              >
                {t('common.close')}
              </button>
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
