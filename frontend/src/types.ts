export type NavTab = 
  | 'dashboard'
  | 'institutions'
  | 'register-institution'
  | 'edit-institution'
  | 'certificates'
  | 'events'
  | 'create-event'
  | 'events-catalog'
  | 'event-registration'
  | 'events-directory'
  | 'participants'
  | 'event-types'
  | 'settings';

export type UserRole = 'admin' | 'public';

export interface Institution {
  id: string;
  name: string;
  code: string; // e.g., INST-2023-001
  cnpjTaxId: string;
  address: string;
  responsiblePerson: string;
  email: string;
  phone: string;
  eventsCount: number;
  status: 'Active' | 'Pending Review' | 'Suspended';
  logoLetter: string;
  bgColor: string;
  logoUrl: string | null;
  adminNome?: string | null;
  adminEmail?: string | null;
}

export interface EventItem {
  id: string;
  title: string;
  category: string;
  type: string;
  modality: string;
  date: string; // e.g., "2024-10-24" or "Oct 15, 2024"
  dateMonth: string; // e.g., "OCTOBER"
  dateDay: string; // e.g., "24"
  time: string; // e.g., "09:00 AM - 05:00 PM EST"
  durationHours: number;
  instructor: string;
  instructorRole?: string;
  institutionId: string;
  institutionName: string;
  description: string;
  spotsLeft?: number;
  closingSoon?: boolean;
  bannerImage?: string;
  status: 'Upcoming' | 'Completed' | 'Draft';
  exigirConclusaoParaEmitir: boolean;
  emissaoLiberada: boolean;
  templateId: string;
  versoParcerias: string;
  versoConteudos: string;
  versoObservacoes: string;
}

export interface Certificate {
  id: string;
  codigoValidacao: string;
  certificateNumber: string;
  studentName: string;
  studentEmail: string;
  eventName: string;
  eventId: string;
  participanteId: string;
  instituicaoId: string;
  institutionName: string;
  issueDate: string;
  durationHours: number;
  instructor: string;
  sha256: string;
  status: 'Active' | 'Revoked' | 'Expired';
}

export interface Participant {
  id: string;
  instituicaoId: string;
  name: string;
  email: string;
  documentId: string;
  birthDate: string | null;
  institution: string;
  certificatesCount: number;
  joinedDate: string;
  status: 'Verified' | 'Pending' | 'Rejected';
}

export interface RegistrationFormData {
  fullName: string;
  email: string;
  documentId: string;
  birthDate: string;
  password?: string;
}
