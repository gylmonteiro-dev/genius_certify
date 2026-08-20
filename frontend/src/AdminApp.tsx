import React, { useEffect, useMemo, useState } from 'react';
import {
  NavTab,
  Institution,
  EventItem,
  Certificate,
  Student,
} from './types';

import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './components/DashboardView';
import { CreateEventView } from './components/CreateEventView';
import { InstitutionsView } from './components/InstitutionsView';
import { RegisterInstitutionView } from './components/RegisterInstitutionView';
import { EventsCatalogView } from './components/EventsCatalogView';
import { EventsDirectoryView } from './components/EventsDirectoryView';
import { CertificatesView } from './components/CertificatesView';
import { StudentsView } from './components/StudentsView';
import { SettingsView } from './components/SettingsView';
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
  createInstituicao,
  deleteInstituicao,
  listInstituicoes,
  mapInstituicaoToUi,
  updateInstituicaoStatus,
} from './lib/instituicoes';
import { CursoCreatePayload, createCurso, listCursos, mapCursoToUi } from './lib/cursos';
import { APP_NAME } from './lib/brand';
import { useT, labelInstitutionStatus } from './i18n';
import { AlunoCreatePayload, createAluno, importAlunosCsv, listAlunos, mapAlunoToUi } from './lib/alunos';
import {
  CertificadoEmitPayload,
  downloadCertificadoPdf,
  emitirCertificado,
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

  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [createEventLoading, setCreateEventLoading] = useState(false);
  const [createEventError, setCreateEventError] = useState<string | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [createStudentLoading, setCreateStudentLoading] = useState(false);
  const [createStudentError, setCreateStudentError] = useState<string | null>(null);

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

  const studentsWithCounts = useMemo(
    () =>
      students.map((student) => ({
        ...student,
        certificatesCount: certificates.filter((cert) => cert.alunoId === student.id).length,
      })),
    [students, certificates],
  );

  useEffect(() => {
    if (!authToken) {
      setInstitutions([]);
      setEvents([]);
      setStudents([]);
      setCertificates([]);
      setInstitutionsError(null);
      setEventsError(null);
      setStudentsError(null);
      setCertificatesError(null);
      return;
    }

    let cancelled = false;

    const loadAll = async () => {
      setInstitutionsLoading(true);
      setEventsLoading(true);
      setStudentsLoading(true);
      setCertificatesLoading(true);
      setInstitutionsError(null);
      setEventsError(null);
      setStudentsError(null);
      setCertificatesError(null);

      const [instResult, cursoResult, alunoResult, certResult] = await Promise.allSettled([
        listInstituicoes(authToken),
        listCursos(authToken),
        listAlunos(authToken),
        listCertificados(authToken),
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

      if (alunoResult.status === 'fulfilled') {
        setStudents(alunoResult.value.map((item) => mapAlunoToUi(item, instUi)));
      } else {
        const err = alunoResult.reason;
        setStudentsError(err instanceof ApiError ? err.message : t('errors.loadStudents'));
        setStudents([]);
      }

      if (certResult.status === 'fulfilled') {
        setCertificates(certResult.value.map(mapCertificadoToUi));
      } else {
        const err = certResult.reason;
        setCertificatesError(err instanceof ApiError ? err.message : t('errors.loadCertificates'));
        setCertificates([]);
      }

      setInstitutionsLoading(false);
      setEventsLoading(false);
      setStudentsLoading(false);
      setCertificatesLoading(false);
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
      const result = await importAlunosCsv(authToken, file, instituicaoId);
      const items = await listAlunos(authToken);
      setStudents(items.map((item) => mapAlunoToUi(item, institutions)));
      showToast(t('toasts.importedStudents', { created: result.created }));
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

  const handleCreateEvent = async (payload: CursoCreatePayload) => {
    if (!authToken) return;
    setCreateEventLoading(true);
    setCreateEventError(null);
    try {
      const created = await createCurso(authToken, payload);
      setEvents((prev) => [mapCursoToUi(created, institutions), ...prev]);
      showToast(t('toasts.eventPublished', { title: created.titulo }));
      setCurrentTab('events');
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t('errors.createEvent');
      setCreateEventError(message);
    } finally {
      setCreateEventLoading(false);
    }
  };

  const handleCreateStudent = async (payload: AlunoCreatePayload) => {
    if (!authToken) return;
    setCreateStudentLoading(true);
    setCreateStudentError(null);
    try {
      const created = await createAluno(authToken, payload);
      setStudents((prev) => [mapAlunoToUi(created, institutions), ...prev]);
      showToast(t('toasts.studentRegistered', { name: created.nome }));
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t('errors.registerStudent');
      setCreateStudentError(message);
      throw err;
    } finally {
      setCreateStudentLoading(false);
    }
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
          name: created.aluno_nome,
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
    if (!authToken || !cert.alunoId) {
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

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col font-sans">
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenIssueModal={() => {
          setIssueError(null);
          setIsIssueModalOpen(true);
        }}
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onLogout={onLogout}
      />

      <TopBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        onSelectTab={setCurrentTab}
        authUser={authUser}
        onLogout={onLogout}
        titleOverride={
          currentTab === 'create-event'
            ? t('topbar.createEvent')
            : currentTab === 'institutions'
              ? t('nav.institutions')
              : currentTab === 'register-institution'
                ? t('topbar.registerInstitution')
                : currentTab === 'events-catalog'
                  ? t('topbar.availableEvents')
                  : currentTab === 'events-directory'
                    ? t('topbar.directory')
                    : currentTab === 'certificates'
                      ? t('nav.certificates')
                      : currentTab === 'students'
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
            onSelectTab={setCurrentTab}
            onOpenIssueModal={() => {
              setIssueError(null);
              setIsIssueModalOpen(true);
            }}
          />
        )}

        {currentTab === 'create-event' && (
          <CreateEventView
            onSubmit={handleCreateEvent}
            onCancel={() => setCurrentTab('events')}
            institutions={institutionsWithCounts}
            isSuperAdmin={isSuperAdmin}
            defaultInstituicaoId={authUser.instituicao_id}
            isSubmitting={createEventLoading}
            errorMessage={createEventError}
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

        {(currentTab === 'events' || currentTab === 'events-directory') && (
          <EventsDirectoryView
            events={events}
            isLoading={eventsLoading}
            errorMessage={eventsError}
            onCreateEventClick={() => {
              setCreateEventError(null);
              setCurrentTab('create-event');
            }}
          />
        )}

        {currentTab === 'events-catalog' && (
          <EventsCatalogView
            events={events}
            onSelectRegister={() => setCurrentTab('students')}
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

        {currentTab === 'students' && (
          <StudentsView
            students={studentsWithCounts}
            institutions={institutionsWithCounts}
            isSuperAdmin={isSuperAdmin}
            isLoading={studentsLoading}
            errorMessage={studentsError}
            isSubmitting={createStudentLoading}
            submitError={createStudentError}
            onCreate={handleCreateStudent}
            onImportCsv={handleImportCsv}
            isImporting={importingCsv}
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
        students={studentsWithCounts}
        institutions={institutionsWithCounts}
        isSuperAdmin={isSuperAdmin}
        isSubmitting={issueLoading}
        errorMessage={issueError}
        onSubmit={handleIssueCertificate}
      />

      <CertificateDetailModal
        certificate={selectedCertDetail}
        onClose={() => setSelectedCertDetail(null)}
        onDownloadPdf={(cert) => void handleDownloadPdf(cert)}
      />

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
