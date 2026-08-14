import React, { useEffect, useState } from 'react';
import { EventItem, Institution, Student } from '../types';
import { CertificadoEmitPayload } from '../lib/certificados';

interface IssueCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: EventItem[];
  students: Student[];
  institutions: Institution[];
  isSuperAdmin: boolean;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onSubmit: (payload: CertificadoEmitPayload) => Promise<void>;
}

export const IssueCertificateModal: React.FC<IssueCertificateModalProps> = ({
  isOpen,
  onClose,
  events,
  students,
  institutions,
  isSuperAdmin,
  isSubmitting = false,
  errorMessage = null,
  onSubmit,
}) => {
  const [instituicaoId, setInstituicaoId] = useState('');
  const [alunoId, setAlunoId] = useState('');
  const [cursoId, setCursoId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    setInstituicaoId(isSuperAdmin ? '' : institutions[0]?.id ?? '');
    setAlunoId('');
    setCursoId('');
  }, [isOpen, isSuperAdmin, institutions]);

  if (!isOpen) return null;

  const scopedStudents = isSuperAdmin && instituicaoId
    ? students.filter((s) => s.instituicaoId === instituicaoId)
    : students;
  const scopedEvents = isSuperAdmin && instituicaoId
    ? events.filter((e) => e.institutionId === instituicaoId)
    : events;

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!alunoId || !cursoId) {
      setFormError('Select a student and a course.');
      return;
    }
    if (isSuperAdmin && !instituicaoId) {
      setFormError('Select an institution.');
      return;
    }
    const payload: CertificadoEmitPayload = {
      aluno_id: alunoId,
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
            <h2 className="text-lg font-bold text-slate-900">Issue New Certificate</h2>
            <p className="text-xs text-slate-500">
              Select an existing student and course from the API.
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
                INSTITUTION
              </label>
              <select
                value={instituicaoId}
                onChange={(e) => {
                  setInstituicaoId(e.target.value);
                  setAlunoId('');
                  setCursoId('');
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2 text-sm text-slate-800"
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

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              STUDENT
            </label>
            <select
              value={alunoId}
              onChange={(e) => setAlunoId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2 text-sm text-slate-800"
            >
              <option value="">Select student</option>
              {scopedStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              COURSE / EVENT
            </label>
            <select
              value={cursoId}
              onChange={(e) => setCursoId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2 text-sm text-slate-800"
            >
              <option value="">Select course</option>
              {scopedEvents.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title} ({evt.institutionName})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-200 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[16px]">verified</span>
              {isSubmitting ? 'Issuing...' : 'Issue Certificate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
