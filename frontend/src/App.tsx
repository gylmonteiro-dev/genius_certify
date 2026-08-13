import React, { useEffect, useState } from 'react';
import {
  NavTab,
  Institution,
  EventItem,
  Certificate,
  Student,
  RegistrationFormData,
} from './types';
import {
  INITIAL_EVENTS,
  INITIAL_CERTIFICATES,
  INITIAL_STUDENTS,
} from './data/initialData';

import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { CreateEventView } from './components/CreateEventView';
import { InstitutionsView } from './components/InstitutionsView';
import { RegisterInstitutionView } from './components/RegisterInstitutionView';
import { EventsCatalogView } from './components/EventsCatalogView';
import { EventRegistrationView } from './components/EventRegistrationView';
import { EventsDirectoryView } from './components/EventsDirectoryView';
import { CertificatesView } from './components/CertificatesView';
import { StudentsView } from './components/StudentsView';
import { IssueCertificateModal } from './components/IssueCertificateModal';
import { CertificateDetailModal } from './components/CertificateDetailModal';
import { Toast } from './components/Toast';
import { ApiError } from './lib/api';
import {
  AuthUser,
  clearStoredToken,
  fetchCurrentUser,
  getStoredToken,
  loginRequest,
  setStoredToken,
} from './lib/auth';
import {
  InstituicaoCreatePayload,
  createInstituicao,
  deleteInstituicao,
  listInstituicoes,
  mapInstituicaoToUi,
  updateInstituicaoStatus,
} from './lib/instituicoes';

export function App() {
  const [authBootstrapping, setAuthBootstrapping] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [institutionsLoading, setInstitutionsLoading] = useState(false);
  const [institutionsError, setInstitutionsError] = useState<string | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [events, setEvents] = useState<EventItem[]>(INITIAL_EVENTS);
  const [certificates, setCertificates] = useState<Certificate[]>(INITIAL_CERTIFICATES);
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);

  const [selectedEventForReg, setSelectedEventForReg] = useState<EventItem>(INITIAL_EVENTS[0]);
  const [selectedCertDetail, setSelectedCertDetail] = useState<Certificate | null>(null);

  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrapAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        if (!cancelled) setAuthBootstrapping(false);
        return;
      }

      try {
        const user = await fetchCurrentUser(token);
        if (!cancelled) {
          setAuthToken(token);
          setAuthUser(user);
        }
      } catch {
        clearStoredToken();
        if (!cancelled) {
          setAuthToken(null);
          setAuthUser(null);
        }
      } finally {
        if (!cancelled) setAuthBootstrapping(false);
      }
    };

    void bootstrapAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authToken) {
      setInstitutions([]);
      setInstitutionsError(null);
      setInstitutionsLoading(false);
      return;
    }

    let cancelled = false;

    const loadInstitutions = async () => {
      setInstitutionsLoading(true);
      setInstitutionsError(null);
      try {
        const items = await listInstituicoes(authToken);
        if (!cancelled) {
          setInstitutions(items.map(mapInstituicaoToUi));
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof ApiError
              ? err.message
              : 'Unable to load institutions.';
          setInstitutionsError(message);
          setInstitutions([]);
        }
      } finally {
        if (!cancelled) setInstitutionsLoading(false);
      }
    };

    void loadInstitutions();
    return () => {
      cancelled = true;
    };
  }, [authToken]);

  const handleLogin = async (email: string, password: string) => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const { access_token } = await loginRequest(email, password);
      const user = await fetchCurrentUser(access_token);
      setStoredToken(access_token);
      setAuthToken(access_token);
      setAuthUser(user);
      showToast(`Welcome, ${user.nome}`);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Unable to sign in. Check your credentials.';
      setLoginError(message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    clearStoredToken();
    setAuthToken(null);
    setAuthUser(null);
    setCurrentTab('dashboard');
    setLoginError(null);
    setInstitutions([]);
    setInstitutionsError(null);
    setRegisterError(null);
  };

  const handleCreateEvent = (newEvent: EventItem) => {
    setEvents([newEvent, ...events]);
    showToast(`Event "${newEvent.title}" published successfully!`);
    setCurrentTab('events');
  };

  const handleRegisterInstitution = async (payload: InstituicaoCreatePayload) => {
    if (!authToken) return;
    setRegisterLoading(true);
    setRegisterError(null);
    try {
      const created = await createInstituicao(authToken, payload);
      setInstitutions((prev) => [mapInstituicaoToUi(created), ...prev]);
      showToast(`Institution "${created.nome}" registered successfully!`);
      setCurrentTab('institutions');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Unable to register institution.';
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
      showToast(`Institution status updated to ${newStatus}`);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Unable to update institution.';
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
      showToast('Institution suspended.');
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Unable to suspend institution.';
      showToast(message);
    }
  };

  const handleIssueCertificateSuccess = (newCert: Certificate) => {
    setCertificates([newCert, ...certificates]);
    showToast(`Certificate ${newCert.certificateNumber} minted for ${newCert.studentName}!`);
  };

  const handleToggleCertificateStatus = (id: string) => {
    setCertificates(
      certificates.map((c) => {
        if (c.id === id) {
          const nextStatus = c.status === 'Active' ? 'Revoked' : 'Active';
          return { ...c, status: nextStatus };
        }
        return c;
      }),
    );
    showToast('Certificate status toggled.');
  };

  const handleEventRegistrationSuccess = (
    event: EventItem,
    formData: RegistrationFormData,
  ) => {
    const newStudent: Student = {
      id: `std-${Date.now()}`,
      name: formData.fullName,
      email: formData.email,
      documentId: formData.documentId,
      institution: event.institutionName,
      certificatesCount: 1,
      joinedDate: new Date().toISOString().split('T')[0],
      status: 'Verified',
    };
    setStudents([newStudent, ...students]);
    showToast(`Registration confirmed for ${formData.fullName}!`);
  };

  if (authBootstrapping) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center text-slate-500 text-sm gap-2">
        <span className="material-symbols-outlined animate-spin text-blue-600">
          progress_activity
        </span>
        Loading CertifyPro...
      </div>
    );
  }

  if (!authUser || !authToken) {
    return (
      <>
        <LoginView
          onSubmit={handleLogin}
          isSubmitting={loginLoading}
          errorMessage={loginError}
        />
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      </>
    );
  }

  const isPublicRegistrationTab = currentTab === 'event-registration';

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col font-sans">
      {!isPublicRegistrationTab && (
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onOpenIssueModal={() => setIsIssueModalOpen(true)}
          isOpenMobile={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
      )}

      <TopBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        onSelectTab={setCurrentTab}
        authUser={authUser}
        onLogout={handleLogout}
        isPublicView={isPublicRegistrationTab}
        titleOverride={
          currentTab === 'create-event'
            ? 'Create Event'
            : currentTab === 'institutions'
              ? 'Institutions'
              : currentTab === 'register-institution'
                ? 'Register Institution'
                : currentTab === 'events-catalog'
                  ? 'Available Events'
                  : currentTab === 'events-directory'
                    ? 'Directory'
                    : currentTab === 'certificates'
                      ? 'Certificates'
                      : currentTab === 'students'
                        ? 'Students Roster'
                        : 'CertifyPro'
        }
      />

      <main
        className={`flex-1 pt-16 transition-all ${
          isPublicRegistrationTab ? 'ml-0' : 'ml-0 md:ml-[260px]'
        }`}
      >
        {currentTab === 'dashboard' && (
          <DashboardView
            institutions={institutions}
            events={events}
            certificates={certificates}
            onSelectTab={setCurrentTab}
            onOpenIssueModal={() => setIsIssueModalOpen(true)}
          />
        )}

        {currentTab === 'create-event' && (
          <CreateEventView
            onCreateEvent={handleCreateEvent}
            onCancel={() => setCurrentTab('events')}
          />
        )}

        {currentTab === 'institutions' && (
          <InstitutionsView
            institutions={institutions}
            isLoading={institutionsLoading}
            errorMessage={institutionsError}
            canManage={authUser.role === 'super_admin'}
            onAddInstitutionClick={() => {
              setRegisterError(null);
              setCurrentTab('register-institution');
            }}
            onUpdateStatus={handleUpdateInstitutionStatus}
            onDeleteInstitution={handleDeleteInstitution}
          />
        )}

        {currentTab === 'register-institution' && authUser.role === 'super_admin' && (
          <RegisterInstitutionView
            onSubmit={handleRegisterInstitution}
            onCancel={() => setCurrentTab('institutions')}
            isSubmitting={registerLoading}
            errorMessage={registerError}
          />
        )}

        {currentTab === 'events' && (
          <EventsDirectoryView
            events={events}
            onSelectEvent={(evt) => {
              setSelectedEventForReg(evt);
              setCurrentTab('event-registration');
            }}
          />
        )}

        {currentTab === 'events-catalog' && (
          <EventsCatalogView
            events={events}
            onSelectRegister={(evt) => {
              setSelectedEventForReg(evt);
              setCurrentTab('event-registration');
            }}
          />
        )}

        {currentTab === 'event-registration' && (
          <EventRegistrationView
            event={selectedEventForReg}
            onSuccessRegister={handleEventRegistrationSuccess}
            onBack={() => setCurrentTab('events-catalog')}
          />
        )}

        {currentTab === 'events-directory' && (
          <EventsDirectoryView
            events={events}
            isPublicView={true}
            onSelectEvent={(evt) => {
              setSelectedEventForReg(evt);
              setCurrentTab('event-registration');
            }}
          />
        )}

        {currentTab === 'certificates' && (
          <CertificatesView
            certificates={certificates}
            onOpenIssueModal={() => setIsIssueModalOpen(true)}
            onViewCertificateDetail={(cert) => setSelectedCertDetail(cert)}
            onToggleStatus={handleToggleCertificateStatus}
          />
        )}

        {currentTab === 'students' && <StudentsView students={students} />}

        {currentTab === 'settings' && (
          <div className="max-w-[1280px] mx-auto p-8">
            <h1 className="text-2xl font-bold mb-4">Enterprise System Settings</h1>
            <p className="text-sm text-gray-600 mb-6">
              Configure system preferences, API webhooks, and security rules.
            </p>
            <div className="bg-white border rounded-lg p-6 space-y-4 max-w-xl text-xs">
              <div>
                <label className="font-bold block mb-1">SIGNED IN AS</label>
                <input
                  type="text"
                  readOnly
                  value={`${authUser.nome} (${authUser.email})`}
                  className="w-full border p-2 rounded bg-gray-50"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">ROLE</label>
                <input
                  type="text"
                  readOnly
                  value={authUser.role}
                  className="w-full border p-2 rounded bg-gray-50"
                />
              </div>
            </div>
          </div>
        )}
      </main>

      <IssueCertificateModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        events={events}
        institutions={institutions}
        onIssueSuccess={handleIssueCertificateSuccess}
      />

      <CertificateDetailModal
        certificate={selectedCertDetail}
        onClose={() => setSelectedCertDetail(null)}
      />

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}

export default App;
