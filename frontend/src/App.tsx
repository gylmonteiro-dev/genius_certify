import React, { useState } from 'react';
import {
  NavTab,
  Institution,
  EventItem,
  Certificate,
  Student,
  RegistrationFormData,
} from './types';
import {
  INITIAL_INSTITUTIONS,
  INITIAL_EVENTS,
  INITIAL_CERTIFICATES,
  INITIAL_STUDENTS,
} from './data/initialData';

import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
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

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Core Datasets
  const [institutions, setInstitutions] = useState<Institution[]>(INITIAL_INSTITUTIONS);
  const [events, setEvents] = useState<EventItem[]>(INITIAL_EVENTS);
  const [certificates, setCertificates] = useState<Certificate[]>(INITIAL_CERTIFICATES);
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);

  // Selection states
  const [selectedEventForReg, setSelectedEventForReg] = useState<EventItem>(INITIAL_EVENTS[0]);
  const [selectedCertDetail, setSelectedCertDetail] = useState<Certificate | null>(null);

  // Modals & Feedback
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  // Handlers
  const handleCreateEvent = (newEvent: EventItem) => {
    setEvents([newEvent, ...events]);
    showToast(`Event "${newEvent.title}" published successfully!`);
    setCurrentTab('events');
  };

  const handleRegisterInstitution = (newInst: Institution) => {
    setInstitutions([newInst, ...institutions]);
    showToast(`Institution "${newInst.name}" registered successfully!`);
    setCurrentTab('institutions');
  };

  const handleUpdateInstitutionStatus = (id: string, newStatus: Institution['status']) => {
    setInstitutions(
      institutions.map((i) => (i.id === id ? { ...i, status: newStatus } : i))
    );
    showToast(`Institution status updated to ${newStatus}`);
  };

  const handleDeleteInstitution = (id: string) => {
    setInstitutions(institutions.filter((i) => i.id !== id));
    showToast('Institution removed from catalog.');
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
      })
    );
    showToast('Certificate status toggled.');
  };

  const handleEventRegistrationSuccess = (event: EventItem, formData: RegistrationFormData) => {
    // Check if student exists or create
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

  const isPublicRegistrationTab = currentTab === 'event-registration';

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col font-sans">
      {/* Sidebar Navigation */}
      {!isPublicRegistrationTab && (
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onOpenIssueModal={() => setIsIssueModalOpen(true)}
          isOpenMobile={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Top Header Navigation */}
      <TopBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        onSelectTab={setCurrentTab}
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

      {/* Main Content Area */}
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
            onAddInstitutionClick={() => setCurrentTab('register-institution')}
            onUpdateStatus={handleUpdateInstitutionStatus}
            onDeleteInstitution={handleDeleteInstitution}
          />
        )}

        {currentTab === 'register-institution' && (
          <RegisterInstitutionView
            onRegister={handleRegisterInstitution}
            onCancel={() => setCurrentTab('institutions')}
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
            <p className="text-sm text-gray-600 mb-6">Configure system preferences, API webhooks, and security rules.</p>
            <div className="bg-white border rounded-lg p-6 space-y-4 max-w-xl text-xs">
              <div>
                <label className="font-bold block mb-1">ORGANIZATION NAME</label>
                <input type="text" readOnly value="CertifyPro Enterprise Admin" className="w-full border p-2 rounded bg-gray-50" />
              </div>
              <div>
                <label className="font-bold block mb-1">CRYPTOGRAPHIC ALGORITHM</label>
                <input type="text" readOnly value="SHA-256 Fingerprinting" className="w-full border p-2 rounded bg-gray-50" />
              </div>
              <div>
                <label className="font-bold block mb-1">LEDGER AUTO-SYNC</label>
                <span className="text-green-700 font-bold">Active & Enabled</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Global Modals */}
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

      {/* Global Toast Notification */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}

export default App;
