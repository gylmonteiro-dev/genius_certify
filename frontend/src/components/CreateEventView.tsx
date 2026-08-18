import React, { useState } from 'react';
import { Institution } from '../types';
import { CursoApiCategoria, CursoApiModalidade, CursoApiTipo, CursoCreatePayload } from '../lib/cursos';

interface CreateEventViewProps {
  onSubmit: (payload: CursoCreatePayload) => Promise<void>;
  onCancel: () => void;
  institutions: Institution[];
  isSuperAdmin: boolean;
  defaultInstituicaoId?: string | null;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

export const CreateEventView: React.FC<CreateEventViewProps> = ({
  onSubmit,
  onCancel,
  institutions,
  isSuperAdmin,
  defaultInstituicaoId = null,
  isSubmitting = false,
  errorMessage = null,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [durationHours, setDurationHours] = useState<number>(8);
  const [instructor, setInstructor] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'draft' | 'upcoming' | 'completed'>('upcoming');
  const [categoria, setCategoria] = useState<CursoApiCategoria>('technology');
  const [modalidade, setModalidade] = useState<CursoApiModalidade>('online');
  const [tipo, setTipo] = useState<CursoApiTipo>('workshop');
  const [instituicaoId, setInstituicaoId] = useState(defaultInstituicaoId ?? '');
  const [sampleStudent, setSampleStudent] = useState('Student Name');
  const [formError, setFormError] = useState<string | null>(null);

  const [templateTheme, setTemplateTheme] = useState<'Classic' | 'Modern Navy' | 'Gold Minimal'>('Modern Navy');
  const [badgeIcon, setBadgeIcon] = useState<'verified' | 'workspace_premium' | 'shield' | 'school'>('shield');

  const formattedDateDisplay = React.useMemo(() => {
    if (!eventDate) return 'Nov 15, 2024';
    try {
      const parts = eventDate.split('-');
      if (parts.length === 3) {
        const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch {
      // fallback
    }
    return eventDate;
  }, [eventDate]);

  const handleFinish = async () => {
    setFormError(null);
    if (!eventName.trim()) {
      setFormError('Event name is required.');
      setCurrentStep(1);
      return;
    }
    if (isSuperAdmin && !instituicaoId) {
      setFormError('Select an institution.');
      setCurrentStep(1);
      return;
    }

    const payload: CursoCreatePayload = {
      titulo: eventName.trim(),
      descricao: description.trim(),
      carga_horaria: Number(durationHours) || 0,
      instrutor: instructor.trim(),
      status,
      data_evento: eventDate || null,
      categoria,
      modalidade,
      tipo,
    };
    if (isSuperAdmin) {
      payload.instituicao_id = instituicaoId;
    }
    await onSubmit(payload);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Create New Event</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure event details and certificate template.
        </p>
      </div>

      {/* Stepper Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl mx-auto shadow-sm">
        <div className="flex items-center justify-between relative">
          {/* Step 1 */}
          <div className="flex flex-col items-center z-10">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                currentStep >= 1
                  ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                  : 'bg-slate-100 text-slate-400 border border-slate-200'
              }`}
            >
              1
            </div>
            <span
              className={`text-xs font-semibold mt-2 ${
                currentStep >= 1 ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              Details
            </span>
          </div>

          {/* Line 1-2 */}
          <div
            className={`flex-1 h-0.5 mx-2 transition-colors ${
              currentStep >= 2 ? 'bg-blue-600' : 'bg-slate-200'
            }`}
          />

          {/* Step 2 */}
          <div className="flex flex-col items-center z-10">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                currentStep >= 2
                  ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                  : 'bg-slate-100 text-slate-400 border border-slate-200'
              }`}
            >
              2
            </div>
            <span
              className={`text-xs font-semibold mt-2 ${
                currentStep >= 2 ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              Template
            </span>
          </div>

          {/* Line 2-3 */}
          <div
            className={`flex-1 h-0.5 mx-2 transition-colors ${
              currentStep >= 3 ? 'bg-blue-600' : 'bg-slate-200'
            }`}
          />

          {/* Step 3 */}
          <div className="flex flex-col items-center z-10">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                currentStep === 3
                  ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                  : 'bg-slate-100 text-slate-400 border border-slate-200'
              }`}
            >
              3
            </div>
            <span
              className={`text-xs font-semibold mt-2 ${
                currentStep === 3 ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              Review
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Form Left, Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form Section */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-6">
                Event Information
              </h2>

              {(formError || errorMessage) && (
                <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {formError || errorMessage}
                </div>
              )}

              <div className="space-y-5">
                {isSuperAdmin && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                      INSTITUTION
                    </label>
                    <select
                      value={instituicaoId}
                      onChange={(e) => setInstituicaoId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                {/* Event Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                    EVENT NAME
                  </label>
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="Annual Tech Symposium 2024"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>

                {/* Date & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                      DATE
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                      DURATION (HOURS)
                    </label>
                    <input
                      type="number"
                      value={durationHours}
                      onChange={(e) => setDurationHours(parseInt(e.target.value) || 1)}
                      min={1}
                      max={200}
                      className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Lead Instructor / Speaker */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                    LEAD INSTRUCTOR / SPEAKER
                  </label>
                  <input
                    type="text"
                    value={instructor}
                    onChange={(e) => setInstructor(e.target.value)}
                    placeholder="Dr. Sarah Jenkins"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                    STATUS
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'draft' | 'upcoming' | 'completed')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="draft">Draft</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                      CATEGORY
                    </label>
                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value as CursoApiCategoria)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="technology">Technology</option>
                      <option value="business">Business</option>
                      <option value="design">Design</option>
                      <option value="data_science">Data Science</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                      MODALITY
                    </label>
                    <select
                      value={modalidade}
                      onChange={(e) => setModalidade(e.target.value as CursoApiModalidade)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="online">Online</option>
                      <option value="presencial">In-Person</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                      TYPE
                    </label>
                    <select
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value as CursoApiTipo)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="workshop">Workshop</option>
                      <option value="seminar">Seminar</option>
                      <option value="exam_prep">Exam Prep</option>
                      <option value="summit">Summit</option>
                      <option value="conference">Conference</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                    DESCRIPTION (INTERNAL)
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Advanced workshop covering modern web security architectures..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Step 1 Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 mt-8">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-5 py-2 rounded-md border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                >
                  Next Step
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                Certificate Template Design
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                Customize the aesthetic layout and badge seal for certificates generated for this event.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                    THEME STYLE
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['Modern Navy', 'Classic', 'Gold Minimal'] as const).map((theme) => (
                      <button
                        key={theme}
                        type="button"
                        onClick={() => setTemplateTheme(theme)}
                        className={`p-3 rounded-lg border text-center text-xs font-semibold transition-all ${
                          templateTheme === theme
                            ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                    BADGE ICON SEAL
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { id: 'shield', label: 'Shield', icon: 'shield' },
                      { id: 'verified', label: 'Verified', icon: 'verified' },
                      { id: 'workspace_premium', label: 'Premium', icon: 'workspace_premium' },
                      { id: 'school', label: 'Academic', icon: 'school' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setBadgeIcon(item.id as any)}
                        className={`p-3 rounded-lg border flex flex-col items-center gap-1 transition-all ${
                          badgeIcon === item.id
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
                        <span className="text-[11px] font-medium">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                    TEST RECIPIENT NAME FOR PREVIEW
                  </label>
                  <input
                    type="text"
                    value={sampleStudent}
                    onChange={(e) => setSampleStudent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2 text-sm text-slate-800"
                  />
                </div>
              </div>

              {/* Step 2 Actions */}
              <div className="flex justify-between gap-3 pt-6 border-t border-slate-200 mt-8">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-5 py-2 rounded-md border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-2 shadow-sm"
                >
                  Review Details
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                Review & Publish Event
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                Please verify the configuration before publishing to the enterprise directory.
              </p>

              {(formError || errorMessage) && (
                <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {formError || errorMessage}
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400 font-medium">Event Name:</span>
                  <span className="font-bold text-slate-800">{eventName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400 font-medium">Date:</span>
                  <span className="font-bold text-slate-800">{formattedDateDisplay}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400 font-medium">Duration:</span>
                  <span className="font-bold text-slate-800">{durationHours} Hours</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400 font-medium">Status:</span>
                  <span className="font-bold text-slate-800 capitalize">{status}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400 font-medium">Lead Instructor:</span>
                  <span className="font-bold text-slate-800">{instructor}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400 font-medium">Selected Template:</span>
                  <span className="font-bold text-blue-600">{templateTheme} Theme ({badgeIcon} seal)</span>
                </div>
                <div className="py-1">
                  <span className="text-slate-400 font-medium block mb-1">Description:</span>
                  <p className="text-slate-800 bg-white p-3 rounded-lg border border-slate-200">
                    {description}
                  </p>
                </div>
              </div>

              {/* Step 3 Actions */}
              <div className="flex justify-between gap-3 pt-6 border-t border-slate-200 mt-8">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2 rounded-md border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => void handleFinish()}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shadow-md flex items-center gap-2 transition-colors disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isSubmitting ? 'progress_activity' : 'publish'}
                  </span>
                  {isSubmitting ? 'Publishing...' : 'Publish Event & Enable Certificates'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Live Preview Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">
              LIVE PREVIEW
            </span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              Real-time Sync
            </span>
          </div>

          {/* Certificate Card Mockup */}
          <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-center relative overflow-hidden transition-all">
            {/* Top Shield/Badge Icon */}
            <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
              <span className="material-symbols-outlined text-[32px]">{badgeIcon}</span>
            </div>

            {/* Subtitle */}
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              CERTIFICATE OF COMPLETION
            </p>

            {/* Student Name */}
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
              {sampleStudent || 'Student Name'}
            </h3>

            <p className="text-xs text-slate-500 mb-4">
              has successfully completed
            </p>

            {/* Event Name Box */}
            <div className="bg-slate-900 text-white font-bold text-sm py-3 px-4 rounded-lg border border-slate-800 max-w-xs mx-auto mb-6 shadow-sm">
              {eventName || 'Annual Tech Symposium 2024'}
            </div>

            <div className="border-t border-slate-100 pt-4 flex justify-between items-end text-left text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  DATE
                </span>
                <span className="font-semibold text-slate-800">
                  {formattedDateDisplay}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  ISSUER
                </span>
                <span className="font-semibold text-slate-800">
                  {instructor || 'Dr. Sarah Jenkins'}
                </span>
              </div>
            </div>

            {/* Cryptographic SHA256 Hash Line */}
            <div className="mt-4 pt-3 border-t border-slate-100 font-mono text-[10px] text-slate-400 truncate">
              SHA256: e3b0c44298fc1c149afbf4c8996fb92427ae4...
            </div>
          </div>

          {/* Info callout below card */}
          <div className="bg-blue-50/60 border border-blue-200/60 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-700">
            <span className="material-symbols-outlined text-blue-600 shrink-0 mt-0.5">
              info
            </span>
            <p>
              This is a dynamic preview. The layout will adapt based on the final template selected in Step 2.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
