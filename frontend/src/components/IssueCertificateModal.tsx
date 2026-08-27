import React, { useEffect, useMemo, useState } from 'react';
import { Certificate, EventItem, Institution, Participant } from '../types';
import { CertificadoEmitPayload } from '../lib/certificados';
import { labelStudentStatus, useT } from '../i18n';

interface IssueCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: EventItem[];
  participants: Participant[];
  institutions: Institution[];
  certificates: Certificate[];
  isSuperAdmin: boolean;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onLoadEnrolled: (cursoId: string) => Promise<Participant[]>;
  onSubmit: (payload: CertificadoEmitPayload) => Promise<void>;
}

export const IssueCertificateModal: React.FC<IssueCertificateModalProps> = ({
  isOpen,
  onClose,
  events,
  participants,
  institutions,
  certificates,
  isSuperAdmin,
  isSubmitting = false,
  errorMessage = null,
  onLoadEnrolled,
  onSubmit,
}) => {
  const { t } = useT();
  const [instituicaoId, setInstituicaoId] = useState('');
  const [participanteId, setParticipanteId] = useState('');
  const [cursoId, setCursoId] = useState('');
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [loadingEnrolled, setLoadingEnrolled] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    setInstituicaoId(isSuperAdmin ? '' : institutions[0]?.id ?? '');
    setParticipanteId('');
    setCursoId('');
    setEnrolledIds([]);
  }, [isOpen, isSuperAdmin, institutions]);

  useEffect(() => {
    if (!isOpen || !cursoId) {
      setEnrolledIds([]);
      return;
    }
    let cancelled = false;
    setLoadingEnrolled(true);
    void onLoadEnrolled(cursoId)
      .then((items) => {
        if (!cancelled) setEnrolledIds(items.map((item) => item.id));
      })
      .catch(() => {
        if (!cancelled) setEnrolledIds([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingEnrolled(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, cursoId, onLoadEnrolled]);

  const scopedEvents = useMemo(() => {
    const byInstitution = isSuperAdmin && instituicaoId
      ? events.filter((e) => e.institutionId === instituicaoId)
      : events;
    return byInstitution.filter((evt) => evt.status !== 'Draft' && evt.status !== 'Cancelled');
  }, [events, isSuperAdmin, instituicaoId]);

  const issuedIds = useMemo(
    () =>
      new Set(
        certificates
          .filter((cert) => cert.eventId === cursoId && cert.status === 'Active')
          .map((cert) => cert.participanteId),
      ),
    [certificates, cursoId],
  );

  const scopedParticipants = useMemo(() => {
    const byInstitution = isSuperAdmin && instituicaoId
      ? participants.filter((item) => item.instituicaoId === instituicaoId)
      : participants;
    const available = byInstitution.filter((item) => !issuedIds.has(item.id));
    if (enrolledIds.length === 0) return available;
    const enrolledSet = new Set(enrolledIds);
    return [
      ...available.filter((item) => enrolledSet.has(item.id)),
      ...available.filter((item) => !enrolledSet.has(item.id)),
    ];
  }, [participants, isSuperAdmin, instituicaoId, enrolledIds, issuedIds]);

  if (!isOpen) return null;

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!participanteId || !cursoId) {
      setFormError(t('issueModal.selectStudentAndCourse'));
      return;
    }
    const selected = participants.find((item) => item.id === participanteId);
    if (selected && selected.status !== 'Verified') {
      setFormError(t('eventIssue.notEligible'));
      return;
    }
    if (isSuperAdmin && !instituicaoId) {
      setFormError(t('issueModal.selectInstitution'));
      return;
    }
    const payload: CertificadoEmitPayload = {
      participante_id: participanteId,
      curso_id: cursoId,
    };
    if (isSuperAdmin) payload.instituicao_id = instituicaoId;
    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-[20px]">workspace_premium</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t('issueModal.title')}</h2>
            <p className="text-xs text-slate-500">
              {t('issueModal.subtitle')}
            </p>
          </div>
        </div>

        <form onSubmit={(e) => void handleIssue(e)} className="space-y-4">
          {(formError || errorMessage) && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {formError || errorMessage}
            </div>
          )}

          {isSuperAdmin && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                {t('common.institution')}
              </label>
              <select
                value={instituicaoId}
                onChange={(e) => {
                  setInstituicaoId(e.target.value);
                  setParticipanteId('');
                  setCursoId('');
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2 text-sm text-slate-800"
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

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              {t('issueModal.courseEvent')}
            </label>
            <select
              value={cursoId}
              onChange={(e) => {
                setCursoId(e.target.value);
                setParticipanteId('');
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2 text-sm text-slate-800"
            >
              <option value="">{t('common.selectCourse')}</option>
              {scopedEvents.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title} ({evt.institutionName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              {t('issueModal.student')}
            </label>
            <select
              value={participanteId}
              onChange={(e) => setParticipanteId(e.target.value)}
              disabled={!cursoId || loadingEnrolled}
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2 text-sm text-slate-800 disabled:opacity-60"
            >
              <option value="">
                {loadingEnrolled ? t('common.loading') : t('common.selectStudent')}
              </option>
              {scopedParticipants.map((item) => {
                const enrolled = enrolledIds.includes(item.id);
                const approved = item.status === 'Verified';
                return (
                  <option key={item.id} value={item.id} disabled={!approved}>
                    {item.name} ({item.email})
                    {enrolled ? ` — ${t('issueModal.enrolled')}` : ''}
                    {!approved ? ` — ${labelStudentStatus(t, item.status)}` : ''}
                  </option>
                );
              })}
            </select>
            {cursoId && !loadingEnrolled && enrolledIds.length === 0 && (
              <p className="text-[11px] text-slate-500 mt-1.5">{t('issueModal.noEnrolledHint')}</p>
            )}
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-200 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[16px]">verified</span>
              {isSubmitting ? t('issueModal.issuing') : t('issueModal.issue')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
