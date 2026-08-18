import { Institution, Student } from '../types';
import { apiRequest } from './api';

export type AlunoApiStatus = 'pending' | 'verified';

export interface AlunoApi {
  id: string;
  instituicao_id: string;
  nome: string;
  email: string;
  documento: string;
  status: AlunoApiStatus;
  created_at: string;
  updated_at: string;
}

export interface AlunoCreatePayload {
  nome: string;
  email: string;
  documento: string;
  instituicao_id?: string;
}

const API_TO_UI_STATUS: Record<AlunoApiStatus, Student['status']> = {
  pending: 'Pending',
  verified: 'Verified',
};

export function mapAlunoToUi(
  item: AlunoApi,
  institutions: Institution[] = [],
  certificatesCount = 0,
): Student {
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
    status: API_TO_UI_STATUS[item.status],
  };
}

export async function listAlunos(token: string): Promise<AlunoApi[]> {
  return apiRequest<AlunoApi[]>('/api/alunos', { method: 'GET' }, token);
}

export async function createAluno(
  token: string,
  payload: AlunoCreatePayload,
): Promise<AlunoApi> {
  return apiRequest<AlunoApi>(
    '/api/alunos',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export interface AlunoImportError {
  linha: number;
  mensagem: string;
}

export interface AlunoImportResult {
  created: number;
  skipped: number;
  errors: AlunoImportError[];
}

export async function importAlunosCsv(
  token: string,
  file: File,
  instituicaoId?: string,
): Promise<AlunoImportResult> {
  const body = new FormData();
  body.append('file', file);
  if (instituicaoId) {
    body.append('instituicao_id', instituicaoId);
  }
  return apiRequest<AlunoImportResult>(
    '/api/alunos/importar',
    { method: 'POST', body },
    token,
  );
}
