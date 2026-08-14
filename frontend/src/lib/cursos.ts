import { EventItem, Institution } from '../types';
import { apiRequest } from './api';

export type CursoApiStatus = 'draft' | 'upcoming' | 'completed';

export interface CursoApi {
  id: string;
  instituicao_id: string;
  titulo: string;
  descricao: string;
  carga_horaria: number;
  instrutor: string;
  status: CursoApiStatus;
  created_at: string;
  updated_at: string;
}

export interface CursoCreatePayload {
  titulo: string;
  descricao?: string;
  carga_horaria: number;
  instrutor?: string;
  status?: CursoApiStatus;
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

function dateParts(iso: string): { date: string; dateMonth: string; dateDay: string } {
  const date = iso.slice(0, 10);
  const parsed = new Date(`${date}T00:00:00`);
  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
  ];
  if (Number.isNaN(parsed.getTime())) {
    return { date, dateMonth: '—', dateDay: '—' };
  }
  return {
    date,
    dateMonth: monthNames[parsed.getMonth()] ?? '—',
    dateDay: String(parsed.getDate()).padStart(2, '0'),
  };
}

export function mapCursoToUi(
  item: CursoApi,
  institutions: Institution[] = [],
): EventItem {
  const parts = dateParts(item.created_at);
  const institution = institutions.find((inst) => inst.id === item.instituicao_id);
  return {
    id: item.id,
    title: item.titulo,
    category: 'Technology',
    type: 'Workshop',
    modality: 'Online',
    date: parts.date,
    dateMonth: parts.dateMonth,
    dateDay: parts.dateDay,
    time: '',
    durationHours: item.carga_horaria,
    instructor: item.instrutor,
    institutionId: item.instituicao_id,
    institutionName: institution?.name ?? '—',
    description: item.descricao || '—',
    status: API_TO_UI_STATUS[item.status],
  };
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
