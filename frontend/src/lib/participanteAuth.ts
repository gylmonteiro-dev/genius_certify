import { apiRequest } from './api';

const TOKEN_KEY = 'nexus_certify_participante_token';

export interface ContaParticipante {
  id: string;
  nome: string;
  email: string;
  documento: string;
  is_active: boolean;
}

export interface ParticipanteLoginResponse {
  access_token: string;
  token_type: string;
}

export type CursoApiStatus = 'draft' | 'upcoming' | 'completed' | 'cancelled';

export interface MinhaInscricao {
  id: string;
  curso_id: string;
  curso_titulo: string;
  instituicao_nome: string;
  data_evento: string | null;
  curso_status: CursoApiStatus;
  inscrito_em: string;
  pode_cancelar: boolean;
  ja_emitido: boolean;
  certificado_id: string | null;
  certificado_status: 'active' | 'revoked' | 'expired' | null;
  codigo_validacao: string | null;
  numero_certificado: string | null;
  inscricao_cancelada: boolean;
  cancelada_justificativa: string | null;
}

export function getStoredParticipanteToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredParticipanteToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredParticipanteToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function participanteLogin(
  documento: string,
  senha: string,
): Promise<ParticipanteLoginResponse> {
  return apiRequest<ParticipanteLoginResponse>('/api/participante/login', {
    method: 'POST',
    body: JSON.stringify({ documento, senha }),
  });
}

export async function participanteCadastrar(payload: {
  documento: string;
  data_nascimento: string;
  email: string;
  senha: string;
}): Promise<ParticipanteLoginResponse> {
  return apiRequest<ParticipanteLoginResponse>('/api/participante/cadastrar', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchContaParticipante(
  token: string,
): Promise<ContaParticipante> {
  return apiRequest<ContaParticipante>('/api/participante/me', { method: 'GET' }, token);
}

export async function listMinhasInscricoes(
  token: string,
): Promise<MinhaInscricao[]> {
  return apiRequest<MinhaInscricao[]>('/api/participante/inscricoes', { method: 'GET' }, token);
}

export async function cancelarMinhaInscricao(
  token: string,
  inscricaoId: string,
): Promise<void> {
  await apiRequest(
    `/api/participante/inscricoes/${inscricaoId}`,
    { method: 'DELETE' },
    token,
  );
}
