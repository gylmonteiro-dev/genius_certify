import type { CollaboratorDisplay, EventCollaborator } from './lib/colaboradores';

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
  date: string; // primeira data, ou created_at no bloco visual quando não há data
  dateMonth: string; // e.g., "OCTOBER"
  dateDay: string; // e.g., "24"
  eventDates: string[];
  time: string; // e.g., "09:00 AM - 05:00 PM EST"
  durationHours: number;
  instructor: string;
  collaborators: EventCollaborator[];
  collaboratorDisplay: CollaboratorDisplay;
  instructorRole?: string;
  institutionId: string;
  institutionName: string;
  description: string;
  limiteParticipantes?: number | null;
  spotsLeft?: number;
  closingSoon?: boolean;
  bannerImage?: string;
  coverCardUrl?: string | null;
  coverDetailUrl?: string | null;
  coverFocusX?: number | null;
  coverFocusY?: number | null;
  status: 'Upcoming' | 'Completed' | 'Draft' | 'Cancelled';
  exigirConclusaoParaEmitir: boolean;
  emissaoLiberada: boolean;
  templateId: string;
  frenteTipo: 'conclusao' | 'participacao';
  frenteTitulo: string;
  frenteAtestacao: string;
  versoParcerias: string;
  versoConteudos: string;
  versoObservacoes: string;
  cancelamentoJustificativa: string;
  canceladoEm: string | null;
  permiteVariasAtividades?: boolean;
  atividadeObrigatoria?: boolean;
  permitirSelecaoParticipante?: boolean;
  selecaoAtividadesAte?: string | null;
  certificadoExigePresencaAtividade?: boolean;
  atividades?: EventActivityChoice[];
}

export interface EventActivityChoice {
  id: string;
  titulo: string;
  descricao: string;
  tipo: string;
  tipoPersonalizado?: string | null;
  data: string;
  horaInicio?: string | null;
  horaFim?: string | null;
  cargaHoraria?: number | null;
  local?: string | null;
  limiteParticipantes?: number | null;
  vagasDisponiveis?: number | null;
  lotada: boolean;
  responsaveis: string;
}

export interface Certificate {
  id: string;
  codigoValidacao: string;
  certificateNumber: string;
  studentName: string;
  studentDocument?: string;
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
  password: string;
  atividadeId?: string | null;
  atividadeIds?: string[];
}
