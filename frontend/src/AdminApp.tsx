import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  NavTab,
  Institution,
  EventItem,
  Certificate,
  Participant,
} from './types';

import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './components/DashboardView';
import { CreateEventView } from './components/CreateEventView';
import { InstitutionsView } from './components/InstitutionsView';
import { RegisterInstitutionView } from './components/RegisterInstitutionView';
import { EditInstitutionView } from './components/EditInstitutionView';
import { EventsCatalogView } from './components/EventsCatalogView';
import { EventsDirectoryView } from './components/EventsDirectoryView';
import { EventIssueView } from './components/EventIssueView';
import { CertificatesView } from './components/CertificatesView';
import { ParticipantsView } from './components/ParticipantsView';
import { SettingsView } from './components/SettingsView';
import { EventTypesView } from './components/EventTypesView';
import { IssueCertificateModal } from './components/IssueCertificateModal';
import { CertificateDetailModal } from './components/CertificateDetailModal';
import { Toast } from './components/Toast';
import { ApiError } from './lib/api';
import {
  AuthUser,
  alterarSenhaRequest,
} from './lib/auth';
import {
  InstituicaoCreatePayload,
  InstituicaoUpdatePayload,
  createInstituicao,
  deleteInstituicao,
  listInstituicoes,
  mapInstituicaoToUi,
  updateInstituicao,
  updateInstituicaoStatus,
  uploadInstituicaoAsset,
} from './lib/instituicoes';
import {
  CursoCreatePayload,
  CursoUpdatePayload,
  InscritoApi,
  createCurso,
  liberarEmissao,
  listCursos,
  listInscritos,
  inscreverParticipantesLote,
  mapCursoToUi,
  removerInscrito,
  cancelarCurso,
  cancelarInscritosLote,
  revogarCertificadosLote,
  updateCurso,
} from './lib/cursos';
import {
  CatalogoEventoCreatePayload,
  CatalogoEventoItem,
  CatalogoEventoUpdatePayload,
  createCatalogoEvento,
  deactivateCatalogoEvento,
  listCatalogoEventos,
  updateCatalogoEvento,
} from './lib/catalogoEventos';
import { APP_NAME } from './lib/brand';
import { useT, labelInstitutionStatus } from './i18n';
import {
  ParticipanteCreatePayload,
  ParticipanteUpdatePayload,
  aprovarParticipante,
  createParticipante,
  getParticipantePorCpf,
  importParticipantesCsv,
  listParticipantes,
  mapParticipanteToUi,
  reprovarParticipante,
  updateParticipante,
} from './lib/participantes';
import {
  CertificadoEmitPayload,
  downloadCertificadoPdf,
  emitirCertificado,
  emitirCertificadosLote,
  listCertificados,
  mapCertificadoToUi,
  mapPublicCertificadoToUi,
  revogarCertificado,
  validarCertificadoPublico,
} from './lib/certificados';

interface AdminAppProps {
  authUser: AuthUser;
  authToken: string;
  onLogout: () => void;
}

export function AdminApp({ authUser, authToken, onLogout }: AdminAppProps) {
  const { t } = useT();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [institutionsLoading, setInstitutionsLoading] = useState(false);
  const [institutionsError, setInstitutionsError] = useState<string | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [editingInstitutionId, setEditingInstitutionId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [createEventLoading, setCreateEventLoading] = useState(false);
  const [createEventError, setCreateEventError] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [issuingEvent, setIssuingEvent] = useState<EventItem | null>(null);
  const [inscritos, setInscritos] = useState<InscritoApi[]>([]);
  const [inscritosLoading, setInscritosLoading] = useState(false);
  const [inscritosError, setInscritosError] = useState<string | null>(null);
  const [releasingEmissao, setReleasingEmissao] = useState(false);
  const [loteIssuing, setLoteIssuing] = useState(false);
  const [enrollingLote, setEnrollingLote] = useState(false);
  const [cancellingEvent, setCancellingEvent] = useState(false);
  const [bulkActing, setBulkActing] = useState(false);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState<string | null>(null);
  const [createParticipantLoading, setCreateParticipantLoading] = useState(false);
  const [createParticipantError, setCreateParticipantError] = useState<string | null>(null);

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [certificatesLoading, setCertificatesLoading] = useState(false);
  const [certificatesError, setCertificatesError] = useState<string | null>(null);
  const [issueLoading, setIssueLoading] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<Certificate | 'NOT_FOUND' | 'INVALID' | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const [selectedCertDetail, setSelectedCertDetail] = useState<Certificate | null>(null);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [catalogItems, setCatalogItems] = useState<CatalogoEventoItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogSubmitting, setCatalogSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const institutionsWithCounts = useMemo(
    () =>
      institutions.map((inst) => ({
        ...inst,
        eventsCount: events.filter((evt) => evt.institutionId === inst.id).length,
      })),
    [institutions, events],
  );

  const editingInstitution = useMemo(
    () =>
      editingInstitutionId
        ? institutionsWithCounts.find((item) => item.id === editingInstitutionId) ?? null
        : null,
    [editingInstitutionId, institutionsWithCounts],
  );

  const participantsWithCounts = useMemo(
    () =>
      participants.map((item) => ({
        ...item,
        certificatesCount: certificates.filter((cert) => cert.participanteId === item.id).length,
      })),
    [participants, certificates],
  );

  useEffect(() => {
    if (!authToken) {
      setInstitutions([]);
      setEvents([]);
      setParticipants([]);
      setCertificates([]);
      setCatalogItems([]);
      setInstitutionsError(null);
      setEventsError(null);
      setParticipantsError(null);
      setCertificatesError(null);
      setCatalogError(null);
      return;
    }

    let cancelled = false;

    const loadAll = async () => {
      setInstitutionsLoading(true);
      setEventsLoading(true);
      setParticipantsLoading(true);
      setCertificatesLoading(true);
      setCatalogLoading(true);
      setInstitutionsError(null);
      setEventsError(null);
      setParticipantsError(null);
      setCertificatesError(null);
      setCatalogError(null);

      const [instResult, cursoResult, participanteResult, certResult, catalogResult] =
        await Promise.allSettled([
          listInstituicoes(authToken),
          listCursos(authToken),
          listParticipantes(authToken),
          listCertificados(authToken),
          listCatalogoEventos(authToken),
        ]);

      if (cancelled) return;

      const instUi =
        instResult.status === 'fulfilled'
          ? instResult.value.map(mapInstituicaoToUi)
          : [];
      setInstitutions(instUi);
      if (instResult.status === 'rejected') {
        const err = instResult.reason;
        setInstitutionsError(err instanceof ApiError ? err.message : t('errors.loadInstitutions'));
      }

      if (cursoResult.status === 'fulfilled') {
        setEvents(cursoResult.value.map((item) => mapCursoToUi(item, instUi)));
      } else {
        const err = cursoResult.reason;
        setEventsError(err instanceof ApiError ? err.message : t('errors.loadEvents'));
        setEvents([]);
      }

      if (participanteResult.status === 'fulfilled') {
        setParticipants(participanteResult.value.map((item) => mapParticipanteToUi(item, instUi)));
      } else {
        const err = participanteResult.reason;
        setParticipantsError(err instanceof ApiError ? err.message : t('errors.loadStudents'));
        setParticipants([]);
      }

      if (certResult.status === 'fulfilled') {
        setCertificates(certResult.value.map(mapCertificadoToUi));
      } else {
        const err = certResult.reason;
        setCertificatesError(err instanceof ApiError ? err.message : t('errors.loadCertificates'));
        setCertificates([]);
      }

      if (catalogResult.status === 'fulfilled') {
        setCatalogItems(catalogResult.value);
      } else {
        const err = catalogResult.reason;
        setCatalogError(err instanceof ApiError ? err.message : t('errors.loadEventTypes'));
        setCatalogItems([]);
      }

      setInstitutionsLoading(false);
      setEventsLoading(false);
      setParticipantsLoading(false);
      setCertificatesLoading(false);
      setCatalogLoading(false);
    };

    void loadAll();
    return () => {
      cancelled = true;
    };
  }, [authToken]);

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(null);
    try {
      await alterarSenhaRequest(authToken, currentPassword, newPassword);
      setPasswordSuccess(t('toasts.passwordUpdated'));
      showToast(t('toasts.passwordUpdated'));
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t('errors.updatePassword');
      setPasswordError(message);
      throw err;
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleImportCsv = async (file: File, instituicaoId?: string) => {
    setImportingCsv(true);
    try {
      const result = await importParticipantesCsv(authToken, file, instituicaoId);
      const items = await listParticipantes(authToken);
      setParticipants(items.map((item) => mapParticipanteToUi(item, institutions)));
      showToast(
        t('toasts.importedStudents', {
          created: result.created,
          reused: result.reused ?? 0,
        }),
      );
      return result;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('errors.importCsv');
      showToast(message);
      throw err;
    } finally {
      setImportingCsv(false);
    }
  };

  const handleRegisterInstitution = async (payload: InstituicaoCreatePayload) => {
    if (!authToken) return;
    setRegisterLoading(true);
    setRegisterError(null);
    try {
      const created = await createInstituicao(authToken, payload);
      setInstitutions((prev) => [mapInstituicaoToUi(created), ...prev]);
      showToast(t('toasts.institutionRegistered', { name: created.nome }));
      setCurrentTab('institutions');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : t('errors.registerInstitution');
      setRegisterError(message);
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleUpdateInstitution = async (payload: InstituicaoUpdatePayload) => {
    if (!authToken || !editingInstitutionId) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const updated = await updateInstituicao(authToken, editingInstitutionId, payload);
      setInstitutions((prev) =>
        prev.map((i) => (i.id === updated.id ? mapInstituicaoToUi(updated) : i)),
      );
      showToast(t('toasts.institutionUpdated', { name: updated.nome }));
      setEditingInstitutionId(null);
      setCurrentTab('institutions');
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t('errors.updateInstitution');
      setEditError(message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleUploadInstitutionLogo = async (file: File) => {
    if (!authToken || !editingInstitutionId) return;
    setLogoUploading(true);
    try {
      const updated = await uploadInstituicaoAsset(
        authToken,
        editingInstitutionId,
        'logo',
        file,
      );
      setInstitutions((prev) =>
        prev.map((i) => (i.id === updated.id ? mapInstituicaoToUi(updated) : i)),
      );
      showToast(t('toasts.institutionLogoUploaded'));
    } finally {
      setLogoUploading(false);
    }
  };

  const handleUpdateInstitutionStatus = async (
    id: string,
    newStatus: Institution['status'],
  ) => {
    if (!authToken) return;
    try {
      const updated = await updateInstituicaoStatus(authToken, id, newStatus);
      setInstitutions((prev) =>
        prev.map((i) => (i.id === id ? mapInstituicaoToUi(updated) : i)),
      );
      showToast(
        t('toasts.institutionStatus', {
          status: labelInstitutionStatus(t, newStatus),
        }),
      );
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t('errors.updateInstitution');
      showToast(message);
    }
  };

  const handleDeleteInstitution = async (id: string) => {
    if (!authToken) return;
    try {
      const updated = await deleteInstituicao(authToken, id);
      setInstitutions((prev) =>
        prev.map((i) => (i.id === id ? mapInstituicaoToUi(updated) : i)),
      );
      showToast(t('toasts.institutionSuspended'));
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t('errors.suspendInstitution');
      showToast(message);
    }
  };

  const upsertCatalogItem = (item: CatalogoEventoItem) => {
    setCatalogItems((prev) => {
      const exists = prev.some((entry) => entry.id === item.id);
      if (exists) {
        return prev.map((entry) => (entry.id === item.id ? item : entry));
      }
      return [...prev, item];
    });
  };

  const handleCreateCatalogItem = async (payload: CatalogoEventoCreatePayload) => {
    setCatalogSubmitting(true);
    setCatalogError(null);
    try {
      const created = await createCatalogoEvento(authToken, payload);
      upsertCatalogItem(created);
      showToast(t('toasts.eventTypeSaved'));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('errors.saveEventType');
      setCatalogError(message);
      throw err;
    } finally {
      setCatalogSubmitting(false);
    }
  };

  const handleUpdateCatalogItem = async (
    id: string,
    payload: CatalogoEventoUpdatePayload,
  ) => {
    setCatalogSubmitting(true);
    setCatalogError(null);
    try {
      const updated = await updateCatalogoEvento(authToken, id, payload);
      upsertCatalogItem(updated);
      showToast(t('toasts.eventTypeSaved'));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('errors.saveEventType');
      setCatalogError(message);
      throw err;
    } finally {
      setCatalogSubmitting(false);
    }
  };

  const handleDeactivateCatalogItem = async (id: string) => {
    setCatalogSubmitting(true);
    setCatalogError(null);
    try {
      const updated = await deactivateCatalogoEvento(authToken, id);
      upsertCatalogItem(updated);
      showToast(t('toasts.eventTypeDeactivated'));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('errors.saveEventType');
      setCatalogError(message);
    } finally {
      setCatalogSubmitting(false);
    }
  };

  const handleCreateEvent = async (payload: CursoCreatePayload) => {
    if (!authToken) return;
    setCreateEventLoading(true);
    setCreateEventError(null);
    try {
      const created = await createCurso(authToken, payload);
      setEvents((prev) => [mapCursoToUi(created, institutions), ...prev]);
      showToast(t('toasts.eventPublished', { title: created.titulo }));
      setEditingEvent(null);
      setCurrentTab('events');
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t('errors.createEvent');
      setCreateEventError(message);
    } finally {
      setCreateEventLoading(false);
    }
  };

  const handleUpdateEvent = async (payload: CursoCreatePayload) => {
    if (!authToken || !editingEvent) return;
    setCreateEventLoading(true);
    setCreateEventError(null);
    try {
      const updatePayload: CursoUpdatePayload = {
        titulo: payload.titulo,
        descricao: payload.descricao,
        carga_horaria: payload.carga_horaria,
        instrutor: payload.instrutor,
        status: payload.status,
        data_evento: payload.data_evento,
        categoria: payload.categoria,
        modalidade: payload.modalidade,
        tipo: payload.tipo,
        exigir_conclusao_para_emitir: payload.exigir_conclusao_para_emitir,
        template_id: payload.template_id,
        verso_parcerias: payload.verso_parcerias,
        verso_conteudos: payload.verso_conteudos,
        verso_observacoes: payload.verso_observacoes,
      };
      const updated = await updateCurso(authToken, editingEvent.id, updatePayload);
      setEvents((prev) =>
        prev.map((evt) =>
          evt.id === updated.id ? mapCursoToUi(updated, institutions) : evt,
        ),
      );
      showToast(t('toasts.eventUpdated', { title: updated.titulo }));
      setEditingEvent(null);
      setCurrentTab('events');
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t('errors.updateEvent');
      setCreateEventError(message);
    } finally {
      setCreateEventLoading(false);
    }
  };

  const handleSetParticipantStatus = async (
    id: string,
    nextStatus: 'verified' | 'rejected',
  ) => {
    if (!authToken) return;
    try {
      const updated =
        nextStatus === 'verified'
          ? await aprovarParticipante(authToken, id)
          : await reprovarParticipante(authToken, id);
      const mapped = mapParticipanteToUi(updated, institutions);
      setParticipants((prev) =>
        prev.map((item) =>
          item.id === mapped.id ? { ...item, ...mapped, certificatesCount: item.certificatesCount } : item,
        ),
      );
      setInscritos((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, status: updated.status } : item)),
      );
      showToast(
        t(
          nextStatus === 'verified'
            ? 'toasts.participantApproved'
            : 'toasts.participantRejected',
          { name: updated.nome },
        ),
      );
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t('errors.updateParticipantStatus');
      showToast(message);
      throw err;
    }
  };

  const handleCreateParticipant = async (payload: ParticipanteCreatePayload) => {
    if (!authToken) return;
    setCreateParticipantLoading(true);
    setCreateParticipantError(null);
    try {
      const created = await createParticipante(authToken, payload);
      const mapped = mapParticipanteToUi(created, institutions);
      setParticipants((prev) => {
        const exists = prev.some((item) => item.id === mapped.id);
        if (exists) {
          return prev.map((item) => (item.id === mapped.id ? { ...item, ...mapped } : item));
        }
        return [mapped, ...prev];
      });
      showToast(
        t(
          participants.some((item) => item.id === created.id)
            ? 'toasts.studentAlreadyRegistered'
            : 'toasts.studentRegistered',
          { name: created.nome },
        ),
      );
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t('errors.registerStudent');
      setCreateParticipantError(message);
      throw err;
    } finally {
      setCreateParticipantLoading(false);
    }
  };

  const handleUpdateParticipant = async (
    id: string,
    payload: ParticipanteUpdatePayload,
  ) => {
    if (!authToken) {
      throw new Error('Sessão expirada');
    }
    const updated = await updateParticipante(authToken, id, payload);
    const mapped = mapParticipanteToUi(updated, institutions);
    setParticipants((prev) =>
      prev.map((item) =>
        item.id === mapped.id
          ? { ...item, ...mapped, certificatesCount: item.certificatesCount }
          : item,
      ),
    );
    showToast(t('toasts.participantUpdated', { name: updated.nome }));
    return updated;
  };

  const handleIssueCertificate = async (payload: CertificadoEmitPayload) => {
    if (!authToken) return;
    setIssueLoading(true);
    setIssueError(null);
    try {
      const created = await emitirCertificado(authToken, payload);
      const mapped = mapCertificadoToUi(created);
      setCertificates((prev) => [mapped, ...prev]);
      showToast(
        t('toasts.certificateIssued', {
          number: created.numero_certificado,
          name: created.participante_nome,
        }),
      );
      setIsIssueModalOpen(false);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t('errors.issueCertificate');
      setIssueError(message);
    } finally {
      setIssueLoading(false);
    }
  };

  const handleRevokeCertificate = async (id: string) => {
    if (!authToken) return;
    try {
      const updated = await revogarCertificado(authToken, id);
      const mapped = mapCertificadoToUi(updated);
      setCertificates((prev) => prev.map((c) => (c.id === id ? mapped : c)));
      showToast(t('toasts.certificateRevoked'));
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t('errors.revokeCertificate');
      showToast(message);
    }
  };

  const handleDownloadPdf = async (cert: Certificate) => {
    if (!authToken || !cert.participanteId) {
      showToast(t('errors.pdfOnlyIssued'));
      return;
    }
    try {
      await downloadCertificadoPdf(authToken, cert.id, `${cert.certificateNumber}.pdf`);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t('errors.downloadPdf');
      showToast(message);
    }
  };

  const handleVerifyCertificate = async (codigo: string) => {
    setIsVerifying(true);
    setVerifyResult(null);
    setVerifyMessage(null);
    try {
      const result = await validarCertificadoPublico(codigo);
      setVerifyMessage(result.mensagem);
      if (result.valido) {
        setVerifyResult(mapPublicCertificadoToUi(result));
      } else if (result.numero_certificado) {
        setVerifyResult('INVALID');
      } else {
        setVerifyResult('NOT_FOUND');
      }
    } catch (err) {
      setVerifyResult('INVALID');
      setVerifyMessage(err instanceof ApiError ? err.message : t('errors.invalidCode'));
    } finally {
      setIsVerifying(false);
    }
  };

  const isSuperAdmin = authUser.role === 'super_admin';

  const loadInscritos = async (eventId: string) => {
    if (!authToken) return;
    setInscritosLoading(true);
    setInscritosError(null);
    try {
      const items = await listInscritos(authToken, eventId);
      setInscritos(items);
    } catch (err) {
      setInscritos([]);
      setInscritosError(
        err instanceof ApiError ? err.message : t('errors.loadEnrolled'),
      );
    } finally {
      setInscritosLoading(false);
    }
  };

  const handleLoadEnrolled = useCallback(
    async (cursoId: string) => {
      const items = await listInscritos(authToken, cursoId);
      const event = events.find((evt) => evt.id === cursoId);
      return items.map((item) =>
        mapParticipanteToUi(
          {
            id: item.id,
            instituicao_id: event?.institutionId ?? '',
            nome: item.nome,
            email: item.email,
            documento: item.documento,
            data_nascimento: null,
            status: item.status,
            created_at: item.inscrito_em,
            updated_at: item.inscrito_em,
          },
          institutions,
        ),
      );
    },
    [authToken, events, institutions],
  );

  const handleOpenEvent = (event: EventItem) => {
    setIssuingEvent(event);
    setInscritos([]);
    void loadInscritos(event.id);
  };

  const handleReleaseEmissao = async () => {
    if (!authToken || !issuingEvent) return;
    setReleasingEmissao(true);
    setInscritosError(null);
    try {
      const updated = await liberarEmissao(authToken, issuingEvent.id);
      const mapped = mapCursoToUi(updated, institutions);
      setEvents((prev) => prev.map((evt) => (evt.id === mapped.id ? mapped : evt)));
      setIssuingEvent(mapped);
      showToast(t('toasts.emissionReleased'));
    } catch (err) {
      setInscritosError(
        err instanceof ApiError ? err.message : t('errors.releaseEmission'),
      );
    } finally {
      setReleasingEmissao(false);
    }
  };

  const handleEnrollLote = async (cursoId: string, participanteIds: string[]) => {
    if (!authToken) return;
    setEnrollingLote(true);
    try {
      const result = await inscreverParticipantesLote(
        authToken,
        cursoId,
        participanteIds,
      );
      const parts = [
        t('toasts.enrolledBatch', {
          enrolled: result.enrolled,
          already: result.already_enrolled,
        }),
      ];
      if (result.errors.length > 0) {
        parts.push(t('toasts.enrollBatchErrors', { count: result.errors.length }));
      }
      showToast(parts.join(' '));
      if (issuingEvent?.id === cursoId) {
        await loadInscritos(cursoId);
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t('errors.enrollBatch');
      showToast(message);
      throw err;
    } finally {
      setEnrollingLote(false);
    }
  };

  const handleRemoveInscrito = async (
    participanteId: string,
    revogarCertificado: boolean,
  ) => {
    if (!authToken || !issuingEvent) return;
    try {
      await removerInscrito(
        authToken,
        issuingEvent.id,
        participanteId,
        revogarCertificado,
      );
      showToast(
        revogarCertificado
          ? t('toasts.enrollmentRemovedRevoked')
          : t('toasts.enrollmentRemoved'),
      );
      await loadInscritos(issuingEvent.id);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t('errors.removeEnrollment');
      showToast(message);
      throw err;
    }
  };

  const handleCancelEvent = async (justificativa: string) => {
    if (!authToken || !issuingEvent) return;
    setCancellingEvent(true);
    setInscritosError(null);
    try {
      const updated = await cancelarCurso(authToken, issuingEvent.id, justificativa);
      const mapped = mapCursoToUi(updated, institutions);
      setEvents((prev) => prev.map((evt) => (evt.id === mapped.id ? mapped : evt)));
      setIssuingEvent(mapped);
      showToast(t('toasts.eventCancelled'));
      await loadInscritos(issuingEvent.id);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('errors.cancelEvent');
      showToast(message);
      throw err;
    } finally {
      setCancellingEvent(false);
    }
  };

  const handleRevokeCertificatesLote = async (participanteIds: string[]) => {
    if (!authToken || !issuingEvent) return;
    setBulkActing(true);
    setInscritosError(null);
    try {
      const result = await revogarCertificadosLote(
        authToken,
        issuingEvent.id,
        participanteIds,
      );
      if (result.revoked > 0) {
        showToast(t('toasts.certificatesRevokedBatch', { count: result.revoked }));
      }
      if (result.errors.length > 0) {
        setInscritosError(result.errors.map((item) => item.mensagem).join(' '));
      }
      await loadInscritos(issuingEvent.id);
      const latest = await listCertificados(authToken);
      setCertificates(latest.map(mapCertificadoToUi));
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t('errors.revokeCertificatesBatch');
      showToast(message);
      throw err;
    } finally {
      setBulkActing(false);
    }
  };

  const handleCancelInscritosLote = async (
    participanteIds: string[],
    revogarCertificados: boolean,
  ) => {
    if (!authToken || !issuingEvent) return;
    setBulkActing(true);
    setInscritosError(null);
    try {
      const result = await cancelarInscritosLote(
        authToken,
        issuingEvent.id,
        participanteIds,
        revogarCertificados,
      );
      if (result.cancelled > 0) {
        showToast(t('toasts.enrollmentsCancelledBatch', { count: result.cancelled }));
      }
      if (result.errors.length > 0) {
        setInscritosError(result.errors.map((item) => item.mensagem).join(' '));
      }
      await loadInscritos(issuingEvent.id);
      if (revogarCertificados && result.revoked > 0) {
        const latest = await listCertificados(authToken);
        setCertificates(latest.map(mapCertificadoToUi));
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t('errors.cancelEnrollmentsBatch');
      showToast(message);
      throw err;
    } finally {
      setBulkActing(false);
    }
  };

  const handleIssueSelected = async (participanteIds: string[]) => {
    if (!authToken || !issuingEvent) return;
    setLoteIssuing(true);
    setInscritosError(null);
    try {
      const result = await emitirCertificadosLote(authToken, {
        curso_id: issuingEvent.id,
        participante_ids: participanteIds,
        ...(isSuperAdmin ? { instituicao_id: issuingEvent.institutionId } : {}),
      });
      const mapped = result.emitidos.map(mapCertificadoToUi);
      if (mapped.length > 0) {
        setCertificates((prev) => [...mapped, ...prev]);
      }
      if (result.emitidos.length > 0) {
        showToast(
          t('toasts.certificatesIssuedBatch', { count: result.emitidos.length }),
        );
      }
      if (result.erros.length > 0) {
        setInscritosError(result.erros.map((item) => item.mensagem).join(' '));
      }
      await loadInscritos(issuingEvent.id);
    } catch (err) {
      setInscritosError(
        err instanceof ApiError ? err.message : t('errors.issueCertificate'),
      );
    } finally {
      setLoteIssuing(false);
    }
  };

  const handleSelectTab = (tab: NavTab) => {
    if (tab === 'create-event') {
      setEditingEvent(null);
      setCreateEventError(null);
    } else if (currentTab === 'create-event') {
      setEditingEvent(null);
    }
    if (tab !== 'edit-institution') {
      setEditingInstitutionId(null);
      setEditError(null);
    }
    setIssuingEvent(null);
    setCurrentTab(tab);
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col font-sans">
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenIssueModal={() => {
          setIssueError(null);
          setIsIssueModalOpen(true);
        }}
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onLogout={onLogout}
        isSuperAdmin={isSuperAdmin}
      />

      <TopBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        onSelectTab={handleSelectTab}
        authUser={authUser}
        onLogout={onLogout}
        titleOverride={
          currentTab === 'create-event'
            ? editingEvent
              ? t('topbar.editEvent')
              : t('topbar.createEvent')
            : currentTab === 'event-types'
              ? t('nav.eventTypes')
            : currentTab === 'institutions'
              ? t('nav.institutions')
              : currentTab === 'register-institution'
                ? t('topbar.registerInstitution')
                : currentTab === 'edit-institution'
                  ? t('topbar.editInstitution')
                : currentTab === 'events-catalog'
                  ? t('topbar.availableEvents')
                  : currentTab === 'events-directory'
                    ? issuingEvent
                      ? t('eventIssue.kicker')
                      : t('topbar.directory')
                    : currentTab === 'events'
                      ? issuingEvent
                        ? t('eventIssue.kicker')
                        : t('topbar.directory')
                    : currentTab === 'certificates'
                      ? t('nav.certificates')
                      : currentTab === 'participants'
                        ? t('topbar.studentsRoster')
                        : APP_NAME
        }
      />

      <main className="flex-1 pt-16 transition-all ml-0 md:ml-[260px]">
        {currentTab === 'dashboard' && (
          <DashboardView
            institutions={institutionsWithCounts}
            events={events}
            certificates={certificates}
            onSelectTab={handleSelectTab}
            onOpenIssueModal={() => {
              setIssueError(null);
              setIsIssueModalOpen(true);
            }}
          />
        )}

        {currentTab === 'create-event' && (
          <CreateEventView
            key={editingEvent?.id ?? 'new'}
            mode={editingEvent ? 'edit' : 'create'}
            initialEvent={editingEvent}
            authToken={authToken}
            onSubmit={editingEvent ? handleUpdateEvent : handleCreateEvent}
            onCancel={() => {
              setEditingEvent(null);
              setCurrentTab('events');
            }}
            institutions={institutionsWithCounts}
            isSuperAdmin={isSuperAdmin}
            defaultInstituicaoId={authUser.instituicao_id}
            isSubmitting={createEventLoading}
            errorMessage={createEventError}
            catalogItems={catalogItems}
          />
        )}

        {currentTab === 'event-types' && isSuperAdmin && (
          <EventTypesView
            items={catalogItems}
            isLoading={catalogLoading}
            errorMessage={catalogError}
            isSubmitting={catalogSubmitting}
            onCreate={handleCreateCatalogItem}
            onUpdate={handleUpdateCatalogItem}
            onDeactivate={handleDeactivateCatalogItem}
          />
        )}

        {currentTab === 'institutions' && (
          <InstitutionsView
            institutions={institutionsWithCounts}
            isLoading={institutionsLoading}
            errorMessage={institutionsError}
            canManage={isSuperAdmin}
            onAddInstitutionClick={() => {
              setRegisterError(null);
              setCurrentTab('register-institution');
            }}
            onEditInstitution={(institution) => {
              setEditingInstitutionId(institution.id);
              setEditError(null);
              setCurrentTab('edit-institution');
            }}
            onUpdateStatus={handleUpdateInstitutionStatus}
            onDeleteInstitution={handleDeleteInstitution}
          />
        )}

        {currentTab === 'register-institution' && isSuperAdmin && (
          <RegisterInstitutionView
            onSubmit={handleRegisterInstitution}
            onCancel={() => setCurrentTab('institutions')}
            isSubmitting={registerLoading}
            errorMessage={registerError}
          />
        )}

        {currentTab === 'edit-institution' && editingInstitution && (
          <EditInstitutionView
            key={editingInstitution.id}
            institution={editingInstitution}
            canChangeAdmin={isSuperAdmin}
            onSubmit={handleUpdateInstitution}
            onUploadLogo={handleUploadInstitutionLogo}
            onCancel={() => {
              setEditingInstitutionId(null);
              setEditError(null);
              setCurrentTab('institutions');
            }}
            isSubmitting={editLoading}
            isUploadingLogo={logoUploading}
            errorMessage={editError}
          />
        )}

        {(currentTab === 'events' || currentTab === 'events-directory') &&
          (issuingEvent ? (
            <EventIssueView
              event={issuingEvent}
              inscritos={inscritos}
              participants={participantsWithCounts}
              isLoading={inscritosLoading}
              errorMessage={inscritosError}
              isReleasing={releasingEmissao}
              isIssuing={loteIssuing}
              isEnrolling={enrollingLote}
              isCancelling={cancellingEvent}
              isBulkActing={bulkActing}
              onBack={() => setIssuingEvent(null)}
              onRelease={handleReleaseEmissao}
              onIssueSelected={handleIssueSelected}
              onEnrollSelected={(participanteIds) =>
                handleEnrollLote(issuingEvent.id, participanteIds)
              }
              onSetStatus={handleSetParticipantStatus}
              onRemoveInscrito={handleRemoveInscrito}
              onCancelEvent={handleCancelEvent}
              onRevokeCertificatesLote={handleRevokeCertificatesLote}
              onCancelInscritosLote={handleCancelInscritosLote}
            />
          ) : (
            <EventsDirectoryView
              events={events}
              institutions={institutionsWithCounts}
              isLoading={eventsLoading}
              errorMessage={eventsError}
              onCreateEventClick={() => {
                setEditingEvent(null);
                setCreateEventError(null);
                setCurrentTab('create-event');
              }}
              onEditEvent={(event) => {
                setEditingEvent(event);
                setCreateEventError(null);
                setCurrentTab('create-event');
              }}
              onOpenEvent={handleOpenEvent}
            />
          ))}

        {currentTab === 'events-catalog' && (
          <EventsCatalogView
            events={events}
            catalogItems={catalogItems}
            onSelectRegister={() => setCurrentTab('participants')}
          />
        )}

        {currentTab === 'certificates' && (
          <CertificatesView
            certificates={certificates}
            isLoading={certificatesLoading}
            errorMessage={certificatesError}
            verifyResult={verifyResult}
            verifyMessage={verifyMessage}
            isVerifying={isVerifying}
            onOpenIssueModal={() => {
              setIssueError(null);
              setIsIssueModalOpen(true);
            }}
            onViewCertificateDetail={(cert) => setSelectedCertDetail(cert)}
            onRevoke={(id) => void handleRevokeCertificate(id)}
            onDownloadPdf={(cert) => void handleDownloadPdf(cert)}
            onVerify={handleVerifyCertificate}
          />
        )}

        {currentTab === 'participants' && (
          <ParticipantsView
            participants={participantsWithCounts}
            institutions={institutionsWithCounts}
            isSuperAdmin={isSuperAdmin}
            isLoading={participantsLoading}
            errorMessage={participantsError}
            isSubmitting={createParticipantLoading}
            submitError={createParticipantError}
            onCreate={handleCreateParticipant}
            onUpdate={handleUpdateParticipant}
            onImportCsv={handleImportCsv}
            onLoadByCpf={(cpf, instituicaoId) =>
              getParticipantePorCpf(authToken, cpf, instituicaoId)
            }
            onSetStatus={handleSetParticipantStatus}
            isImporting={importingCsv}
            events={events}
            isEnrolling={enrollingLote}
            onEnrollSelected={handleEnrollLote}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            authUser={authUser}
            onChangePassword={handleChangePassword}
            isSubmitting={passwordLoading}
            errorMessage={passwordError}
            successMessage={passwordSuccess}
          />
        )}
      </main>

      <IssueCertificateModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        events={events}
        participants={participantsWithCounts}
        institutions={institutionsWithCounts}
        certificates={certificates}
        isSuperAdmin={isSuperAdmin}
        isSubmitting={issueLoading}
        errorMessage={issueError}
        onLoadEnrolled={handleLoadEnrolled}
        onSubmit={handleIssueCertificate}
      />

      <CertificateDetailModal
        certificate={selectedCertDetail}
        authToken={authToken}
        onClose={() => setSelectedCertDetail(null)}
        onDownloadPdf={(cert) => void handleDownloadPdf(cert)}
      />

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
