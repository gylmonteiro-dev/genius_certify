import { apiRequest } from './api';

export interface DashboardResumo {
  eventos_total: number;
  eventos_abertos: number;
  eventos_cancelados: number;
  eventos_rascunho: number;
  eventos_concluidos: number;
  certificados_emitidos: number;
  certificados_validados: number;
  certificados_revogados: number;
  certificados_expirados: number;
  acessos_certificados_total: number;
}

export async function fetchDashboardResumo(token: string): Promise<DashboardResumo> {
  return apiRequest<DashboardResumo>('/api/dashboard/resumo', { method: 'GET' }, token);
}
