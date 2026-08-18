import { EventItem, Institution } from '../types';
import { apiRequest } from './api';

export type CursoApiStatus = 'draft' | 'upcoming' | 'completed';
export type CursoApiCategoria = 'technology' | 'business' | 'design' | 'data_science';
export type CursoApiModalidade = 'online' | 'presencial';
export type CursoApiTipo = 'workshop' | 'seminar' | 'exam_prep' | 'summit' | 'conference';

export interface CursoApi {
  id: string;
  instituicao_id: string;
  titulo: string;
  descricao: string;
  carga_horaria: number;
  instrutor: string;
  status: CursoApiStatus;
  data_evento: string | null;
  categoria: CursoApiCategoria | null;
  modalidade: CursoApiModalidade | null;
  tipo: string | null;
  created_at: string;
  updated_at: string;
}

export interface CursoPublicApi {
  id: string;
  titulo: string;
  descricao: string;
  carga_horaria: number;
  instrutor: string;
  status: CursoApiStatus;
  instituicao_nome: string;
  data_evento: string | null;
  categoria: CursoApiCategoria | null;
  modalidade: CursoApiModalidade | null;
  tipo: string | null;
}

export interface CursoCreatePayload {
  titulo: string;
  descricao?: string;
  carga_horaria: number;
  instrutor?: string;
  status?: CursoApiStatus;
  data_evento?: string | null;
  categoria?: CursoApiCategoria | null;
  modalidade?: CursoApiModalidade | null;
  tipo?: string | null;
  instituicao_id?: string;
}

const UI_TO_API_STATUS: Record<EventItem['status'], CursoApiStatus> = {
  Draft: 'draft',
  Upcoming: 'upcoming',
  Completed: 'completed',
};

const API_TO_UI_STATUS: Record<CursoApiStatus, EventItem['status']> = {
  draft: 'Draft',
  upcoming: 'Upcoming',
  completed: 'Completed',
};

const API_TO_UI_CATEGORY: Record<CursoApiCategoria, EventItem['category']> = {
  technology: 'Technology',
  business: 'Business',
  design: 'Design',
  data_science: 'Data Science',
};

const API_TO_UI_MODALITY: Record<CursoApiModalidade, EventItem['modality']> = {
  online: 'Online',
  presencial: 'In-Person',
};

const API_TO_UI_TYPE: Record<string, EventItem['type']> = {
  workshop: 'Workshop',
  seminar: 'Seminar',
  exam_prep: 'Exam Prep',
  summit: 'Summit',
  conference: 'Conference',
};

function dateParts(iso: string | null | undefined): { date: string; dateMonth: string; dateDay: string } {
  const date = (iso ?? '').slice(0, 10);
  const parsed = new Date(`${date}T00:00:00`);
  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
  ];
  if (!date || Number.isNaN(parsed.getTime())) {
    return { date: date || '—', dateMonth: '—', dateDay: '—' };
  }
  return {
    date,
    dateMonth: monthNames[parsed.getMonth()] ?? '—',
    dateDay: String(parsed.getDate()).padStart(2, '0'),
  };
}

function mapEventFields(item: {
  id: string;
  titulo: string;
  descricao: string;
  carga_horaria: number;
  instrutor: string;
  status: CursoApiStatus;
  data_evento: string | null;
  categoria: CursoApiCategoria | null;
  modalidade: CursoApiModalidade | null;
  tipo: string | null;
  created_at?: string;
  instituicaoId: string;
  institutionName: string;
}): EventItem {
  const parts = dateParts(item.data_evento ?? item.created_at);
  return {
    id: item.id,
    title: item.titulo,
    category: item.categoria ? API_TO_UI_CATEGORY[item.categoria] : 'Technology',
    type: item.tipo && API_TO_UI_TYPE[item.tipo] ? API_TO_UI_TYPE[item.tipo] : 'Workshop',
    modality: item.modalidade ? API_TO_UI_MODALITY[item.modalidade] : 'Online',
    date: parts.date,
    dateMonth: parts.dateMonth,
    dateDay: parts.dateDay,
    time: '',
    durationHours: item.carga_horaria,
    instructor: item.instrutor,
    institutionId: item.instituicaoId,
    institutionName: item.institutionName,
    description: item.descricao || '—',
    status: API_TO_UI_STATUS[item.status],
  };
}

export function mapCursoToUi(
  item: CursoApi,
  institutions: Institution[] = [],
): EventItem {
  const institution = institutions.find((inst) => inst.id === item.instituicao_id);
  return mapEventFields({
    ...item,
    instituicaoId: item.instituicao_id,
    institutionName: institution?.name ?? '—',
  });
}

export function mapCursoPublicToUi(item: CursoPublicApi): EventItem {
  return mapEventFields({
    ...item,
    instituicaoId: '',
    institutionName: item.instituicao_nome,
  });
}

export function toCursoApiStatus(status: EventItem['status']): CursoApiStatus {
  return UI_TO_API_STATUS[status];
}

export async function listCursos(token: string): Promise<CursoApi[]> {
  return apiRequest<CursoApi[]>('/api/cursos', { method: 'GET' }, token);
}

export async function createCurso(
  token: string,
  payload: CursoCreatePayload,
): Promise<CursoApi> {
  return apiRequest<CursoApi>(
    '/api/cursos',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export async function listCursosPublicos(): Promise<CursoPublicApi[]> {
  return apiRequest<CursoPublicApi[]>('/api/publico/cursos', { method: 'GET' });
}

export async function getCursoPublico(id: string): Promise<CursoPublicApi> {
  return apiRequest<CursoPublicApi>(`/api/publico/cursos/${id}`, { method: 'GET' });
}

export async function inscreverCursoPublico(
  cursoId: string,
  payload: { nome: string; email: string; documento: string },
): Promise<void> {
  await apiRequest(`/api/publico/cursos/${cursoId}/inscrever`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
