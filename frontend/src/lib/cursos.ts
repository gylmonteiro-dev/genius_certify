import { EventItem, Institution } from '../types';
import { apiRequest } from './api';
import { ParticipanteApiStatus } from './participantes';
import { CertificadoApiStatus } from './certificados';

export type CursoApiStatus = 'draft' | 'upcoming' | 'completed';

export interface CursoApi {
  id: string;
  instituicao_id: string;
  titulo: string;
  descricao: string;
  carga_horaria: number;
  instrutor: string;
  status: CursoApiStatus;
  data_evento: string | null;
  categoria: string | null;
  modalidade: string | null;
  tipo: string | null;
  exigir_conclusao_para_emitir: boolean;
  emissao_liberada: boolean;
  template_id?: string;
  verso_parcerias?: string | null;
  verso_conteudos?: string | null;
  verso_observacoes?: string | null;
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
  categoria: string | null;
  modalidade: string | null;
  tipo: string | null;
  verso_parcerias?: string | null;
  verso_conteudos?: string | null;
  verso_observacoes?: string | null;
}

export interface CursoCreatePayload {
  titulo: string;
  descricao?: string;
  carga_horaria: number;
  instrutor?: string;
  status?: CursoApiStatus;
  data_evento?: string | null;
  categoria?: string | null;
  modalidade?: string | null;
  tipo?: string | null;
  exigir_conclusao_para_emitir?: boolean;
  template_id?: string;
  verso_parcerias?: string | null;
  verso_conteudos?: string | null;
  verso_observacoes?: string | null;
  instituicao_id?: string;
}

export type CursoUpdatePayload = Omit<CursoCreatePayload, 'instituicao_id'>;

export type EventPublicVisibility =
  | 'open'
  | 'hidden_draft'
  | 'hidden_completed'
  | 'hidden_institution';

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
  categoria: string | null;
  modalidade: string | null;
  tipo: string | null;
  created_at?: string;
  instituicaoId: string;
  institutionName: string;
  exigir_conclusao_para_emitir?: boolean;
  emissao_liberada?: boolean;
  template_id?: string;
  verso_parcerias?: string | null;
  verso_conteudos?: string | null;
  verso_observacoes?: string | null;
}): EventItem {
  const parts = dateParts(item.data_evento ?? item.created_at);
  return {
    id: item.id,
    title: item.titulo,
    category: item.categoria ?? '',
    type: item.tipo ?? '',
    modality: item.modalidade ?? '',
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
    exigirConclusaoParaEmitir: item.exigir_conclusao_para_emitir ?? true,
    emissaoLiberada: item.emissao_liberada ?? false,
    templateId: item.template_id ?? 'classic',
    versoParcerias: item.verso_parcerias ?? '',
    versoConteudos: item.verso_conteudos ?? '',
    versoObservacoes: item.verso_observacoes ?? '',
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

export function getEventPublicVisibility(
  status: CursoApiStatus | EventItem['status'],
  institutionStatus: Institution['status'] | undefined,
): EventPublicVisibility {
  const apiStatus =
    status === 'Draft' || status === 'draft'
      ? 'draft'
      : status === 'Completed' || status === 'completed'
        ? 'completed'
        : 'upcoming';

  if (apiStatus === 'draft') return 'hidden_draft';
  if (institutionStatus !== 'Active') return 'hidden_institution';
  if (apiStatus === 'completed') return 'hidden_completed';
  return 'open';
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

export async function updateCurso(
  token: string,
  cursoId: string,
  payload: CursoUpdatePayload,
): Promise<CursoApi> {
  return apiRequest<CursoApi>(
    `/api/cursos/${cursoId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  );
}

export interface InscritoApi {
  id: string;
  nome: string;
  email: string;
  documento: string;
  status: ParticipanteApiStatus;
  inscrito_em: string;
  ja_emitido: boolean;
  certificado_id: string | null;
  certificado_status: CertificadoApiStatus | null;
  numero_certificado: string | null;
}

export async function listInscritos(
  token: string,
  cursoId: string,
): Promise<InscritoApi[]> {
  return apiRequest<InscritoApi[]>(
    `/api/cursos/${cursoId}/inscritos`,
    { method: 'GET' },
    token,
  );
}

export interface InscricaoLoteErro {
  participante_id: string;
  mensagem: string;
}

export interface InscricaoLoteResult {
  enrolled: number;
  already_enrolled: number;
  errors: InscricaoLoteErro[];
}

export async function inscreverParticipantesLote(
  token: string,
  cursoId: string,
  participanteIds: string[],
): Promise<InscricaoLoteResult> {
  return apiRequest<InscricaoLoteResult>(
    `/api/cursos/${cursoId}/inscrever-lote`,
    {
      method: 'POST',
      body: JSON.stringify({ participante_ids: participanteIds }),
    },
    token,
  );
}

export async function liberarEmissao(
  token: string,
  cursoId: string,
): Promise<CursoApi> {
  return apiRequest<CursoApi>(
    `/api/cursos/${cursoId}/liberar-emissao`,
    { method: 'POST' },
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
  payload: { nome: string; email: string; documento: string; data_nascimento: string },
): Promise<void> {
  await apiRequest(`/api/publico/cursos/${cursoId}/inscrever`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
