import React, { useEffect, useMemo, useState } from 'react';
import { EventItem, Institution } from '../types';
import {
  CursoApiStatus,
  CursoCreatePayload,
  EventPublicVisibility,
  getEventPublicVisibility,
  toCursoApiStatus,
} from '../lib/cursos';
import { catalogByKind, CatalogoEventoItem, catalogLabel } from '../lib/catalogoEventos';
import { certificateHtmlForPage, fetchCertificadoTemplatePreview } from '../lib/certificados';
import { frentePreset } from '../lib/certificateFront';
import { formatDisplayDate, labelEventStatus, useT } from '../i18n';
import { CertificateHtmlViewer } from './CertificateHtmlViewer';
import { DateField } from './DateField';

const CERTIFICATE_TEMPLATES = [
  { id: 'excelencia', nameKey: 'createEvent.templateExcelencia', hintKey: 'createEvent.templateExcelenciaHint' },
  { id: 'classic', nameKey: 'createEvent.templateClassic', hintKey: 'createEvent.templateClassicHint' },
] as const;

interface CreateEventViewProps {
  onSubmit: (payload: CursoCreatePayload & { atualizar_certificados_emitidos?: boolean }) => Promise<void>;
  onCancel: () => void;
  institutions: Institution[];
  isSuperAdmin: boolean;
  authToken: string;
  defaultInstituicaoId?: string | null;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  mode?: 'create' | 'edit';
  initialEvent?: EventItem | null;
  catalogItems?: CatalogoEventoItem[];
}

function visibilityMessageKey(
  visibility: EventPublicVisibility,
):
  | 'createEvent.visibilityOpen'
  | 'createEvent.visibilityDraft'
  | 'createEvent.visibilityCompleted'
  | 'createEvent.visibilityCancelled'
  | 'createEvent.visibilityInstitution' {
  if (visibility === 'open') return 'createEvent.visibilityOpen';
  if (visibility === 'hidden_draft') return 'createEvent.visibilityDraft';
  if (visibility === 'hidden_completed') return 'createEvent.visibilityCompleted';
  if (visibility === 'hidden_cancelled') return 'createEvent.visibilityCancelled';
  return 'createEvent.visibilityInstitution';
}

export const CreateEventView: React.FC<CreateEventViewProps> = ({
  onSubmit,
  onCancel,
  institutions,
  isSuperAdmin,
  authToken,
  defaultInstituicaoId = null,
  isSubmitting = false,
  errorMessage = null,
  mode = 'create',
  initialEvent = null,
  catalogItems = [],
}) => {
  const { t, dateLocale, locale } = useT();
  const isEdit = mode === 'edit';
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [eventName, setEventName] = useState(initialEvent?.title ?? '');
  const [eventDate, setEventDate] = useState(
    initialEvent?.date && /^\d{4}-\d{2}-\d{2}$/.test(initialEvent.date)
      ? initialEvent.date
      : '',
  );
  const [durationHours, setDurationHours] = useState<number>(initialEvent?.durationHours ?? 8);
  const [instructor, setInstructor] = useState(initialEvent?.instructor ?? '');
  const [description, setDescription] = useState(
    initialEvent && initialEvent.description !== '—' ? initialEvent.description : '',
  );
  const isCancelled = initialEvent?.status === 'Cancelled';
  const [status, setStatus] = useState<CursoApiStatus>(
    initialEvent ? toCursoApiStatus(initialEvent.status) : 'upcoming',
  );
  const categoriaOptions = useMemo(
    () => catalogByKind(catalogItems, 'categoria', { includeSlug: initialEvent?.category }),
    [catalogItems, initialEvent?.category],
  );
  const modalidadeOptions = useMemo(
    () => catalogByKind(catalogItems, 'modalidade', { includeSlug: initialEvent?.modality }),
    [catalogItems, initialEvent?.modality],
  );
  const tipoOptions = useMemo(
    () => catalogByKind(catalogItems, 'tipo', { includeSlug: initialEvent?.type }),
    [catalogItems, initialEvent?.type],
  );

  const [categoria, setCategoria] = useState(
    initialEvent?.category || categoriaOptions[0]?.slug || '',
  );
  const [modalidade, setModalidade] = useState(
    initialEvent?.modality || modalidadeOptions[0]?.slug || '',
  );
  const [tipo, setTipo] = useState(initialEvent?.type || tipoOptions[0]?.slug || '');
  const [versoParcerias, setVersoParcerias] = useState(initialEvent?.versoParcerias ?? '');
  const [versoConteudos, setVersoConteudos] = useState(initialEvent?.versoConteudos ?? '');
  const [versoObservacoes, setVersoObservacoes] = useState(
    initialEvent?.versoObservacoes ?? '',
  );
  const [previewPage, setPreviewPage] = useState<'frente' | 'verso'>('frente');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [instituicaoId, setInstituicaoId] = useState(
    initialEvent?.institutionId || defaultInstituicaoId || '',
  );
  const [exigirConclusao, setExigirConclusao] = useState(
    initialEvent?.exigirConclusaoParaEmitir ?? true,
  );
  const [sampleStudent, setSampleStudent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const selectedInstitution = useMemo(
    () => institutions.find((inst) => inst.id === instituicaoId),
    [institutions, instituicaoId],
  );
  const visibility = getEventPublicVisibility(status, selectedInstitution?.status);

  const [templateId, setTemplateId] = useState(
    initialEvent?.templateId ?? 'excelencia',
  );
  const [frentePersonalizada, setFrentePersonalizada] = useState(
    Boolean(initialEvent?.frenteTitulo?.trim() || initialEvent?.frenteAtestacao?.trim()),
  );
  const [frenteTitulo, setFrenteTitulo] = useState(initialEvent?.frenteTitulo ?? '');
  const [frenteAtestacao, setFrenteAtestacao] = useState(initialEvent?.frenteAtestacao ?? '');
  const [atualizarCertificadosEmitidos, setAtualizarCertificadosEmitidos] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const hasVerso = Boolean(
    versoParcerias.trim() || versoConteudos.trim() || versoObservacoes.trim(),
  );

  useEffect(() => {
    if (!categoria && categoriaOptions[0]) setCategoria(categoriaOptions[0].slug);
    if (!modalidade && modalidadeOptions[0]) setModalidade(modalidadeOptions[0].slug);
    if (!tipo && tipoOptions[0]) setTipo(tipoOptions[0].slug);
  }, [categoria, modalidade, tipo, categoriaOptions, modalidadeOptions, tipoOptions]);

  useEffect(() => {
    if (!hasVerso && previewPage === 'verso') {
      setPreviewPage('frente');
    }
  }, [hasVerso, previewPage]);

  useEffect(() => {
    if (!previewModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewModalOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [previewModalOpen]);

  const selectedTemplate = CERTIFICATE_TEMPLATES.find((item) => item.id === templateId)
    ?? CERTIFICATE_TEMPLATES[0];

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const html = await fetchCertificadoTemplatePreview(authToken, {
            templateId,
            participanteNome: sampleStudent.trim() || t('createEvent.sampleStudentDefault'),
            cursoTitulo: eventName.trim() || t('createEvent.eventNamePlaceholder'),
            instituicaoNome: selectedInstitution?.name ?? '',
            instituicaoId: instituicaoId || undefined,
            cargaHoraria: Number(durationHours) || 0,
            instrutor: instructor,
            versoParcerias,
            versoConteudos,
            versoObservacoes,
            frenteTitulo: frentePersonalizada ? frenteTitulo : undefined,
            frenteAtestacao: frentePersonalizada ? frenteAtestacao : undefined,
            dataEvento: eventDate || null,
          });
          setPreviewHtml(html);
          setPreviewError(null);
        } catch {
          setPreviewHtml('');
          setPreviewError(t('createEvent.previewError'));
        }
      })();
    }, 350);
    return () => window.clearTimeout(handle);
  }, [
    authToken,
    templateId,
    sampleStudent,
    eventName,
    selectedInstitution?.name,
    instituicaoId,
    durationHours,
    instructor,
    versoParcerias,
    versoConteudos,
    versoObservacoes,
    frentePersonalizada,
    frenteTitulo,
    frenteAtestacao,
    eventDate,
    t,
  ]);

  const formattedDateDisplay = React.useMemo(() => {
    if (!eventDate) return t('createEvent.dateFallback');
    return formatDisplayDate(eventDate, dateLocale, eventDate);
  }, [eventDate, dateLocale, t]);

  const handleFinish = async () => {
    if (isCancelled) return;
    setFormError(null);
    if (!eventName.trim()) {
      setFormError(t('createEvent.nameRequired'));
      setCurrentStep(1);
      return;
    }
    if (!isEdit && isSuperAdmin && !instituicaoId) {
      setFormError(t('createEvent.selectInstitution'));
      setCurrentStep(1);
      return;
    }

    const payload: CursoCreatePayload & { atualizar_certificados_emitidos?: boolean } = {
      titulo: eventName.trim(),
      descricao: description.trim(),
      carga_horaria: Number(durationHours) || 0,
      instrutor: instructor.trim(),
      status,
      data_evento: eventDate || null,
      categoria: categoria || null,
      modalidade: modalidade || null,
      tipo: tipo || null,
      exigir_conclusao_para_emitir: exigirConclusao,
      template_id: templateId,
      frente_titulo: frentePersonalizada ? frenteTitulo.trim() || null : null,
      frente_atestacao: frentePersonalizada ? frenteAtestacao.trim() || null : null,
      verso_parcerias: versoParcerias.trim() || null,
      verso_conteudos: versoConteudos.trim() || null,
      verso_observacoes: versoObservacoes.trim() || null,
    };
    if (!isEdit && isSuperAdmin) {
      payload.instituicao_id = instituicaoId;
    }
    if (isEdit) {
      payload.atualizar_certificados_emitidos = atualizarCertificadosEmitidos;
    }
    await onSubmit(payload);
  };

  const visibilityBanner = (
    <div
      className={`rounded-md border px-4 py-3 text-sm ${
        visibility === 'open'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : visibility === 'hidden_institution'
            ? 'border-amber-200 bg-amber-50 text-amber-800'
            : visibility === 'hidden_cancelled'
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-slate-200 bg-slate-50 text-slate-600'
      }`}
    >
      {t(visibilityMessageKey(visibility))}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          {isEdit ? t('createEvent.editTitle') : t('createEvent.title')}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {isEdit ? t('createEvent.editSubtitle') : t('createEvent.subtitle')}
        </p>
        {isCancelled && (
          <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {t('createEvent.cancelledReadOnly')}
          </div>
        )}
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
              {t('createEvent.stepDetails')}
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
              {t('createEvent.stepTemplate')}
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
              {t('createEvent.stepReview')}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Form Left, Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form Section */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
          <fieldset disabled={isCancelled} className="disabled:opacity-80">
          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-6">
                {t('createEvent.eventInformation')}
              </h2>

              {(formError || errorMessage) && (
                <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {formError || errorMessage}
                </div>
              )}

              <div className="space-y-5">
                {(isSuperAdmin || isEdit) && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                      {t('common.institution')}
                    </label>
                    <select
                      value={instituicaoId}
                      onChange={(e) => setInstituicaoId(e.target.value)}
                      disabled={isEdit}
                      className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('common.selectInstitution')}</option>
                      {isEdit &&
                        instituicaoId &&
                        !institutions.some((inst) => inst.id === instituicaoId) && (
                          <option value={instituicaoId}>
                            {initialEvent?.institutionName || instituicaoId}
                          </option>
                        )}
                      {institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.code ? `${inst.name} (${inst.code})` : inst.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {/* Event Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                    {t('createEvent.eventName')}
                  </label>
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder={t('createEvent.eventNamePlaceholder')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>

                {/* Date & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                      {t('common.date')}
                    </label>
                    <div className="relative">
                      <DateField
                        value={eventDate}
                        onChange={setEventDate}
                        className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                      {t('createEvent.durationHours')}
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
                    {t('createEvent.instructor')}
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
                    {t('createEvent.status')}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CursoApiStatus)}
                    disabled={isCancelled}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                  >
                    {isCancelled ? (
                      <option value="cancelled">{t('status.event.cancelled')}</option>
                    ) : (
                      <>
                        <option value="upcoming">{t('status.event.upcoming')}</option>
                        <option value="draft">{t('status.event.draft')}</option>
                        <option value="completed">{t('status.event.completed')}</option>
                      </>
                    )}
                  </select>
                </div>

                <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exigirConclusao}
                    onChange={(e) => setExigirConclusao(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">
                      {t('createEvent.requireCompletion')}
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5">
                      {t('createEvent.requireCompletionHint')}
                    </span>
                  </span>
                </label>

                {visibilityBanner}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                      {t('createEvent.category')}
                    </label>
                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {categoriaOptions.map((item) => (
                        <option key={item.id} value={item.slug}>
                          {catalogLabel(catalogItems, 'categoria', item.slug, locale)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                      {t('createEvent.modality')}
                    </label>
                    <select
                      value={modalidade}
                      onChange={(e) => setModalidade(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {modalidadeOptions.map((item) => (
                        <option key={item.id} value={item.slug}>
                          {catalogLabel(catalogItems, 'modalidade', item.slug, locale)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                      {t('createEvent.type')}
                    </label>
                    <select
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {tipoOptions.map((item) => (
                        <option key={item.id} value={item.slug}>
                          {catalogLabel(catalogItems, 'tipo', item.slug, locale)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                    {t('createEvent.descriptionInternal')}
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('createEvent.descriptionPlaceholder')}
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
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                >
                  {t('createEvent.nextStep')}
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                {t('createEvent.templateTitle')}
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                {t('createEvent.templateHint')}
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                    {t('createEvent.templateStyle')}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {CERTIFICATE_TEMPLATES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (frentePersonalizada) {
                            const previous = frentePreset(templateId);
                            const nextPreset = frentePreset(item.id);
                            if (frenteTitulo.trim() === previous.titulo) {
                              setFrenteTitulo(nextPreset.titulo);
                            }
                            if (frenteAtestacao.trim() === previous.atestacao) {
                              setFrenteAtestacao(nextPreset.atestacao);
                            }
                          }
                          setTemplateId(item.id);
                        }}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          templateId === item.id
                            ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="block text-xs font-semibold">{t(item.nameKey)}</span>
                        <span className="block text-[11px] font-normal text-slate-500 mt-1">
                          {t(item.hintKey)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      {t('createEvent.frenteTitle')}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{t('createEvent.frenteHint')}</p>
                  </div>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={frentePersonalizada}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setFrentePersonalizada(next);
                        if (next) {
                          const preset = frentePreset(templateId);
                          setFrenteTitulo((current) => current.trim() || preset.titulo);
                          setFrenteAtestacao((current) => current.trim() || preset.atestacao);
                        }
                      }}
                      className="mt-0.5"
                    />
                    <span className="text-sm font-semibold text-slate-800">
                      {t('createEvent.frentePersonalizar')}
                    </span>
                  </label>
                  {frentePersonalizada && (
                    <>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                          {t('createEvent.frenteTitulo')}
                        </label>
                        <input
                          type="text"
                          maxLength={255}
                          value={frenteTitulo}
                          onChange={(e) => setFrenteTitulo(e.target.value)}
                          placeholder={t('createEvent.frenteTituloPlaceholder')}
                          className="w-full bg-white border border-slate-200 rounded-md px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                          {t('createEvent.frenteAtestacao')}
                        </label>
                        <input
                          type="text"
                          maxLength={255}
                          value={frenteAtestacao}
                          onChange={(e) => setFrenteAtestacao(e.target.value)}
                          placeholder={t('createEvent.frenteAtestacaoPlaceholder')}
                          className="w-full bg-white border border-slate-200 rounded-md px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                          {t('createEvent.frenteAtestacaoHint')}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      {t('createEvent.versoTitle')}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{t('createEvent.versoHint')}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                      {t('createEvent.versoParcerias')}
                    </label>
                    <textarea
                      rows={3}
                      value={versoParcerias}
                      onChange={(e) => setVersoParcerias(e.target.value)}
                      placeholder={t('createEvent.versoParceriasPlaceholder')}
                      className="w-full bg-white border border-slate-200 rounded-md px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                      {t('createEvent.versoConteudos')}
                    </label>
                    <textarea
                      rows={3}
                      value={versoConteudos}
                      onChange={(e) => setVersoConteudos(e.target.value)}
                      placeholder={t('createEvent.versoConteudosPlaceholder')}
                      className="w-full bg-white border border-slate-200 rounded-md px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                      {t('createEvent.versoObservacoes')}
                    </label>
                    <textarea
                      rows={3}
                      value={versoObservacoes}
                      onChange={(e) => setVersoObservacoes(e.target.value)}
                      placeholder={t('createEvent.versoObservacoesPlaceholder')}
                      className="w-full bg-white border border-slate-200 rounded-md px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                    {t('createEvent.testRecipient')}
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
                  {t('common.back')}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-2 shadow-sm"
                >
                  {t('createEvent.reviewDetails')}
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                {isEdit ? t('createEvent.reviewTitleEdit') : t('createEvent.reviewTitle')}
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                {isEdit ? t('createEvent.reviewHintEdit') : t('createEvent.reviewHint')}
              </p>

              {(formError || errorMessage) && (
                <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {formError || errorMessage}
                </div>
              )}

              <div className="mb-4">{visibilityBanner}</div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400 font-medium">{t('createEvent.eventName')}:</span>
                  <span className="font-bold text-slate-800">{eventName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400 font-medium">{t('common.date')}:</span>
                  <span className="font-bold text-slate-800">{formattedDateDisplay}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400 font-medium">{t('createEvent.durationHours')}:</span>
                  <span className="font-bold text-slate-800">{t('createEvent.durationValue', { hours: durationHours })}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400 font-medium">{t('createEvent.status')}:</span>
                  <span className="font-bold text-slate-800">
                    {labelEventStatus(
                      t,
                      status === 'upcoming'
                        ? 'Upcoming'
                        : status === 'draft'
                          ? 'Draft'
                          : status === 'cancelled'
                            ? 'Cancelled'
                            : 'Completed',
                    )}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400 font-medium">{t('createEvent.instructor')}:</span>
                  <span className="font-bold text-slate-800">{instructor}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400 font-medium">{t('createEvent.stepTemplate')}:</span>
                  <span className="font-bold text-blue-600">
                    {t('createEvent.selectedTemplate', { name: t(selectedTemplate.nameKey) })}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 gap-4">
                  <span className="text-slate-400 font-medium">{t('createEvent.frenteTitle')}:</span>
                  <span className="font-bold text-slate-800 text-right">
                    {frentePersonalizada
                      ? `${frenteTitulo.trim() || t('createEvent.frentePadrao')} · ${frenteAtestacao.trim() || t('createEvent.frentePadrao')}`
                      : t('createEvent.frentePadrao')}
                  </span>
                </div>
                <div className="py-1">
                  <span className="text-slate-400 font-medium block mb-1">{t('common.description')}:</span>
                  <p className="text-slate-800 bg-white p-3 rounded-lg border border-slate-200">
                    {description}
                  </p>
                </div>
                {hasVerso && (
                  <div className="py-1 space-y-2">
                    <span className="text-slate-400 font-medium block">
                      {t('createEvent.versoTitle')}
                    </span>
                    {versoParcerias.trim() && (
                      <p className="text-slate-800 bg-white p-3 rounded-lg border border-slate-200 whitespace-pre-wrap">
                        <span className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                          {t('createEvent.versoParcerias')}
                        </span>
                        {versoParcerias}
                      </p>
                    )}
                    {versoConteudos.trim() && (
                      <p className="text-slate-800 bg-white p-3 rounded-lg border border-slate-200 whitespace-pre-wrap">
                        <span className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                          {t('createEvent.versoConteudos')}
                        </span>
                        {versoConteudos}
                      </p>
                    )}
                    {versoObservacoes.trim() && (
                      <p className="text-slate-800 bg-white p-3 rounded-lg border border-slate-200 whitespace-pre-wrap">
                        <span className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                          {t('createEvent.versoObservacoes')}
                        </span>
                        {versoObservacoes}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {isEdit && (
                <label className="mt-6 flex items-start gap-2.5 cursor-pointer rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={atualizarCertificadosEmitidos}
                    onChange={(e) => setAtualizarCertificadosEmitidos(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">
                      {t('createEvent.updateIssuedCertificates')}
                    </span>
                    <span className="block text-xs text-slate-600 mt-1">
                      {t('createEvent.updateIssuedCertificatesHint')}
                    </span>
                  </span>
                </label>
              )}

              {/* Step 3 Actions */}
              <div className="flex justify-between gap-3 pt-6 border-t border-slate-200 mt-8">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2 rounded-md border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
                >
                  {t('common.back')}
                </button>
                <button
                  type="button"
                  onClick={() => void handleFinish()}
                  disabled={isSubmitting || isCancelled}
                  className="px-6 py-2.5 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shadow-md flex items-center gap-2 transition-colors disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isSubmitting ? 'progress_activity' : isEdit ? 'save' : 'publish'}
                  </span>
                  {isSubmitting
                    ? isEdit
                      ? t('createEvent.saving')
                      : t('createEvent.publishing')
                    : isEdit
                      ? t('createEvent.save')
                      : t('createEvent.publish')}
                </button>
              </div>
            </div>
          )}
          </fieldset>
        </div>

        {/* Right Live Preview Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">
              {t('createEvent.livePreview')}
            </span>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-full border border-slate-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewPage('frente')}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    previewPage === 'frente'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t('createEvent.previewFront')}
                </button>
                <button
                  type="button"
                  disabled={!hasVerso}
                  title={!hasVerso ? t('createEvent.previewBackDisabled') : undefined}
                  onClick={() => setPreviewPage('verso')}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold disabled:opacity-40 ${
                    previewPage === 'verso'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t('createEvent.previewBack')}
                </button>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                {t('createEvent.realtimeSync')}
              </span>
            </div>
          </div>

          {previewError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-8 text-center text-sm text-rose-700">
              {previewError}
            </div>
          ) : previewHtml ? (
            <button
              type="button"
              onClick={() => setPreviewModalOpen(true)}
              title={t('createEvent.previewExpand')}
              className="relative w-full text-left rounded-xl overflow-hidden group focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <CertificateHtmlViewer
                title={t('createEvent.livePreview')}
                html={certificateHtmlForPage(previewHtml, hasVerso ? previewPage : 'frente')}
                className="pointer-events-none w-full aspect-[11/8.5] min-h-[240px] rounded-xl border border-slate-200 bg-[#f4f4f2]"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 group-hover:bg-slate-900/35 transition-colors">
                <span className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm">
                  <span className="material-symbols-outlined text-[18px]">open_in_full</span>
                  {t('createEvent.previewExpand')}
                </span>
              </span>
            </button>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-16 text-center text-sm text-slate-500">
              {t('common.loading')}
            </div>
          )}

          {/* Info callout below card */}
          <div className="bg-blue-50/60 border border-blue-200/60 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-700">
            <span className="material-symbols-outlined text-blue-600 shrink-0 mt-0.5">
              info
            </span>
            <p>
              {t('createEvent.previewHint')} {t('createEvent.previewExpandHint')}
            </p>
          </div>
        </div>
      </div>

      {previewModalOpen && previewHtml && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 md:p-6"
          onClick={() => setPreviewModalOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="certificate-preview-title"
            className="relative w-full max-w-[min(1123px,calc(100vw-1.5rem))] flex flex-col gap-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 text-white">
              <h2 id="certificate-preview-title" className="text-sm font-semibold">
                {t('createEvent.livePreview')}
              </h2>
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-full border border-white/20 bg-white/10 p-0.5">
                  <button
                    type="button"
                    onClick={() => setPreviewPage('frente')}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      previewPage === 'frente'
                        ? 'bg-white text-slate-900'
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    {t('createEvent.previewFront')}
                  </button>
                  <button
                    type="button"
                    disabled={!hasVerso}
                    title={!hasVerso ? t('createEvent.previewBackDisabled') : undefined}
                    onClick={() => setPreviewPage('verso')}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold disabled:opacity-40 ${
                      previewPage === 'verso'
                        ? 'bg-white text-slate-900'
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    {t('createEvent.previewBack')}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10"
                  aria-label={t('common.close')}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
            <div
              className="w-full mx-auto shadow-2xl"
              style={{
                maxWidth: 'min(1123px, calc((100vh - 6rem) * 11 / 8.5), calc(100vw - 1.5rem))',
                aspectRatio: '11 / 8.5',
              }}
            >
              <CertificateHtmlViewer
                title={t('createEvent.livePreview')}
                html={certificateHtmlForPage(previewHtml, hasVerso ? previewPage : 'frente')}
                className="w-full h-full rounded-lg border border-slate-200 bg-[#f4f4f2]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
