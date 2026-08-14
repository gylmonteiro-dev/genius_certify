import { Certificate } from '../types';
import { apiRequest, apiRequestBlob } from './api';

export type CertificadoApiStatus = 'active' | 'revoked' | 'expired';

export interface CertificadoApi {
  id: string;
  codigo_validacao: string;
  instituicao_id: string;
  curso_id: string;
  aluno_id: string;
  numero_certificado: string;
  aluno_nome: string;
  curso_titulo: string;
  instituicao_nome: string;
  carga_horaria: number;
  instrutor: string;
  sha256: string | null;
  status: CertificadoApiStatus;
  created_at: string;
  updated_at: string;
}

export interface CertificadoPublicApi {
  valido: boolean;
  codigo_validacao: string;
  numero_certificado: string | null;
  aluno_nome: string | null;
  curso_titulo: string | null;
  instituicao_nome: string | null;
  carga_horaria: number | null;
  instrutor: string | null;
  status: CertificadoApiStatus | null;
  emitido_em: string | null;
  mensagem: string;
}

export interface CertificadoEmitPayload {
  aluno_id: string;
  curso_id: string;
  instituicao_id?: string;
}

const API_TO_UI_STATUS: Record<CertificadoApiStatus, Certificate['status']> = {
  active: 'Active',
  revoked: 'Revoked',
  expired: 'Expired',
};

export function mapCertificadoToUi(item: CertificadoApi): Certificate {
  return {
    id: item.id,
    codigoValidacao: item.codigo_validacao,
    certificateNumber: item.numero_certificado,
    studentName: item.aluno_nome,
    studentEmail: '—',
    eventName: item.curso_titulo,
    eventId: item.curso_id,
    alunoId: item.aluno_id,
    instituicaoId: item.instituicao_id,
    institutionName: item.instituicao_nome,
    issueDate: item.created_at.slice(0, 10),
    durationHours: item.carga_horaria,
    instructor: item.instrutor,
    sha256: item.sha256 ?? '',
    status: API_TO_UI_STATUS[item.status],
  };
}

export function mapPublicCertificadoToUi(item: CertificadoPublicApi): Certificate {
  return {
    id: item.codigo_validacao,
    codigoValidacao: item.codigo_validacao,
    certificateNumber: item.numero_certificado ?? '—',
    studentName: item.aluno_nome ?? '—',
    studentEmail: '—',
    eventName: item.curso_titulo ?? '—',
    eventId: '',
    alunoId: '',
    instituicaoId: '',
    institutionName: item.instituicao_nome ?? '—',
    issueDate: item.emitido_em?.slice(0, 10) ?? '—',
    durationHours: item.carga_horaria ?? 0,
    instructor: item.instrutor ?? '—',
    sha256: '',
    status: item.status ? API_TO_UI_STATUS[item.status] : 'Expired',
  };
}

export async function listCertificados(token: string): Promise<CertificadoApi[]> {
  return apiRequest<CertificadoApi[]>('/api/certificados', { method: 'GET' }, token);
}

export async function emitirCertificado(
  token: string,
  payload: CertificadoEmitPayload,
): Promise<CertificadoApi> {
  return apiRequest<CertificadoApi>(
    '/api/certificados/emitir',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export async function revogarCertificado(
  token: string,
  id: string,
): Promise<CertificadoApi> {
  return apiRequest<CertificadoApi>(
    `/api/certificados/${id}/revogar`,
    { method: 'POST' },
    token,
  );
}

export async function validarCertificadoPublico(
  codigoValidacao: string,
): Promise<CertificadoPublicApi> {
  return apiRequest<CertificadoPublicApi>(
    `/api/certificados/validar/${codigoValidacao}`,
    { method: 'GET' },
  );
}

export async function downloadCertificadoPdf(
  token: string,
  id: string,
  filename: string,
): Promise<void> {
  const blob = await apiRequestBlob(`/api/certificados/${id}/pdf`, token);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
