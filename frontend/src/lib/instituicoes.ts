import { Institution } from '../types';
import { apiRequest } from './api';

export type InstituicaoApiStatus = 'active' | 'pending_review' | 'suspended';

export interface InstituicaoApi {
  id: string;
  nome: string;
  codigo: string;
  cnpj: string;
  endereco: string;
  responsavel: string;
  email: string;
  telefone: string;
  logo_url: string | null;
  assinatura_url: string | null;
  status: InstituicaoApiStatus;
  created_at: string;
  updated_at: string;
}

export interface InstituicaoCreatePayload {
  nome: string;
  codigo: string;
  cnpj: string;
  responsavel: string;
  email: string;
  endereco?: string;
  telefone?: string;
  admin_nome?: string;
  admin_email?: string;
  admin_password?: string;
}

const AVATAR_COLORS = [
  'bg-[#dae2fd] text-[#131b2e]',
  'bg-[#d3e4fe] text-[#45464d]',
];

const UI_TO_API_STATUS: Record<Institution['status'], InstituicaoApiStatus> = {
  Active: 'active',
  'Pending Review': 'pending_review',
  Suspended: 'suspended',
};

const API_TO_UI_STATUS: Record<InstituicaoApiStatus, Institution['status']> = {
  active: 'Active',
  pending_review: 'Pending Review',
  suspended: 'Suspended',
};

function formatCnpj(digits: string): string {
  const d = digits.replace(/\D/g, '');
  if (d.length !== 14) return digits;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function logoLetter(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return nome.trim().slice(0, 2).toUpperCase() || 'IN';
}

function avatarColor(nome: string): string {
  const code = [...nome].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

export function mapInstituicaoToUi(item: InstituicaoApi): Institution {
  return {
    id: item.id,
    name: item.nome,
    code: item.codigo,
    cnpjTaxId: formatCnpj(item.cnpj),
    address: item.endereco || '—',
    responsiblePerson: item.responsavel,
    email: item.email,
    phone: item.telefone || '—',
    eventsCount: 0,
    status: API_TO_UI_STATUS[item.status],
    logoLetter: logoLetter(item.nome),
    bgColor: avatarColor(item.nome),
  };
}

export function toApiStatus(status: Institution['status']): InstituicaoApiStatus {
  return UI_TO_API_STATUS[status];
}

export async function listInstituicoes(token: string): Promise<InstituicaoApi[]> {
  return apiRequest<InstituicaoApi[]>('/api/instituicoes', { method: 'GET' }, token);
}

export async function createInstituicao(
  token: string,
  payload: InstituicaoCreatePayload,
): Promise<InstituicaoApi> {
  return apiRequest<InstituicaoApi>(
    '/api/instituicoes',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export async function updateInstituicaoStatus(
  token: string,
  id: string,
  status: Institution['status'],
): Promise<InstituicaoApi> {
  return apiRequest<InstituicaoApi>(
    `/api/instituicoes/${id}`,
    { method: 'PATCH', body: JSON.stringify({ status: toApiStatus(status) }) },
    token,
  );
}

export async function deleteInstituicao(
  token: string,
  id: string,
): Promise<InstituicaoApi> {
  return apiRequest<InstituicaoApi>(
    `/api/instituicoes/${id}`,
    { method: 'DELETE' },
    token,
  );
}
