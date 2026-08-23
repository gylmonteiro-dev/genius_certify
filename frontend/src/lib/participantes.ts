import { Institution, Participant } from '../types';
import { apiRequest } from './api';

export type ParticipanteApiStatus = 'pending' | 'verified' | 'rejected';

export interface ParticipanteApi {
  id: string;
  instituicao_id: string;
  nome: string;
  email: string;
  documento: string;
  status: ParticipanteApiStatus;
  created_at: string;
  updated_at: string;
}

export interface ParticipanteCreatePayload {
  nome: string;
  email: string;
  documento: string;
  instituicao_id?: string;
}

const API_TO_UI_STATUS: Record<ParticipanteApiStatus, Participant['status']> = {
  pending: 'Pending',
  verified: 'Verified',
  rejected: 'Rejected',
};

export function mapParticipanteStatus(status: ParticipanteApiStatus): Participant['status'] {
  return API_TO_UI_STATUS[status] ?? 'Pending';
}

export function mapParticipanteToUi(
  item: ParticipanteApi,
  institutions: Institution[] = [],
  certificatesCount = 0,
): Participant {
  const institution = institutions.find((inst) => inst.id === item.instituicao_id);
  return {
    id: item.id,
    instituicaoId: item.instituicao_id,
    name: item.nome,
    email: item.email,
    documentId: item.documento,
    institution: institution?.name ?? '—',
    certificatesCount,
    joinedDate: item.created_at.slice(0, 10),
    status: mapParticipanteStatus(item.status),
  };
}

export async function aprovarParticipante(
  token: string,
  id: string,
): Promise<ParticipanteApi> {
  return apiRequest<ParticipanteApi>(
    `/api/participantes/${id}/aprovar`,
    { method: 'POST' },
    token,
  );
}

export async function reprovarParticipante(
  token: string,
  id: string,
): Promise<ParticipanteApi> {
  return apiRequest<ParticipanteApi>(
    `/api/participantes/${id}/reprovar`,
    { method: 'POST' },
    token,
  );
}

export async function listParticipantes(token: string): Promise<ParticipanteApi[]> {
  return apiRequest<ParticipanteApi[]>('/api/participantes', { method: 'GET' }, token);
}

export async function createParticipante(
  token: string,
  payload: ParticipanteCreatePayload,
): Promise<ParticipanteApi> {
  return apiRequest<ParticipanteApi>(
    '/api/participantes',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export interface ParticipanteImportError {
  linha: number;
  mensagem: string;
}

export interface ParticipanteEventoApi {
  curso_id: string;
  curso_titulo: string;
  data_evento: string | null;
  curso_status: 'draft' | 'upcoming' | 'completed';
  inscrito_em: string;
  ja_emitido: boolean;
  certificado_id: string | null;
  numero_certificado: string | null;
}

export interface ParticipanteDetalheApi extends ParticipanteApi {
  eventos: ParticipanteEventoApi[];
}

export interface ParticipanteImportResult {
  created: number;
  skipped: number;
  reused: number;
  errors: ParticipanteImportError[];
}

export async function getParticipantePorCpf(
  token: string,
  documento: string,
  instituicaoId?: string,
): Promise<ParticipanteDetalheApi> {
  const params = new URLSearchParams({ documento });
  if (instituicaoId) params.set('instituicao_id', instituicaoId);
  return apiRequest<ParticipanteDetalheApi>(
    `/api/participantes/por-cpf?${params.toString()}`,
    { method: 'GET' },
    token,
  );
}

export async function importParticipantesCsv(
  token: string,
  file: File,
  instituicaoId?: string,
): Promise<ParticipanteImportResult> {
  const body = new FormData();
  body.append('file', file);
  if (instituicaoId) {
    body.append('instituicao_id', instituicaoId);
  }
  return apiRequest<ParticipanteImportResult>(
    '/api/participantes/importar',
    { method: 'POST', body },
    token,
  );
}
