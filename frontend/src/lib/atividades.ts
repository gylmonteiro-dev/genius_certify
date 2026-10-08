import { apiRequest } from './api';

export const ACTIVITY_TYPES = [
  'oficina',
  'palestra',
  'minicurso',
  'mesa_redonda',
  'atividade_pratica',
  'outro',
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_STATUSES = ['ativa', 'inativa', 'cancelada', 'encerrada'] as const;

export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

export type ParticipationStatus =
  | 'selecionada'
  | 'confirmada'
  | 'presente'
  | 'ausente'
  | 'cancelada';

export interface ActivityResponsibleApi {
  colaborador_id: string;
  nome: string;
  funcao: string;
  funcao_personalizada?: string | null;
  ordem: number;
}

export interface ActivityApi {
  id: string;
  instituicao_id: string;
  curso_id: string;
  titulo: string;
  descricao: string;
  tipo: ActivityType;
  tipo_personalizado?: string | null;
  data: string;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  carga_horaria?: number | null;
  local?: string | null;
  limite_participantes?: number | null;
  status: ActivityStatus;
  ordem: number;
  vagas_ocupadas: number;
  vagas_disponiveis?: number | null;
  lotada: boolean;
  responsaveis: ActivityResponsibleApi[];
}

export interface ActivityWritePayload {
  titulo: string;
  descricao?: string;
  tipo: ActivityType;
  tipo_personalizado?: string | null;
  data: string;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  carga_horaria?: number | null;
  local?: string | null;
  limite_participantes?: number | null;
  status?: ActivityStatus;
  ordem?: number;
  colaborador_ids: string[];
}

export interface ActivityPublicApi {
  id: string;
  titulo: string;
  descricao: string;
  tipo: ActivityType;
  tipo_personalizado?: string | null;
  data: string;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  carga_horaria?: number | null;
  local?: string | null;
  limite_participantes?: number | null;
  vagas_ocupadas: number;
  vagas_disponiveis?: number | null;
  lotada: boolean;
  responsaveis: ActivityResponsibleApi[];
}

export interface ParticipantActivitiesApi {
  permite_varias_atividades: boolean;
  atividade_obrigatoria: boolean;
  permitir_selecao_participante: boolean;
  selecao_atividades_ate?: string | null;
  pode_alterar: boolean;
  atividades: Array<ActivityPublicApi & {
    selecionada: boolean;
    status_participacao?: ParticipationStatus | null;
  }>;
}

export interface InscricaoAtividadeResumo {
  atividade_id: string;
  titulo: string;
  status: ParticipationStatus;
}

export function hoursFromSchedule(start: string, end: string): number | null {
  const toMinutes = (value: string): number | null => {
    const match = /^(\d{2}):(\d{2})/.exec(value);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  };
  const begin = toMinutes(start);
  const finish = toMinutes(end);
  if (begin == null || finish == null || finish <= begin) return null;
  return Math.max(1, Math.round((finish - begin) / 60));
}

export function formatActivityHours(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, 5);
}

export function responsibleLabel(people: ActivityResponsibleApi[]): string {
  return people.map((item) => item.nome).filter(Boolean).join(', ');
}

export async function listAtividades(token: string, cursoId: string): Promise<ActivityApi[]> {
  return apiRequest<ActivityApi[]>(`/api/cursos/${cursoId}/atividades`, { method: 'GET' }, token);
}

export async function createAtividade(
  token: string,
  cursoId: string,
  payload: ActivityWritePayload,
): Promise<ActivityApi> {
  return apiRequest<ActivityApi>(
    `/api/cursos/${cursoId}/atividades`,
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export async function updateAtividade(
  token: string,
  cursoId: string,
  atividadeId: string,
  payload: ActivityWritePayload,
): Promise<ActivityApi> {
  return apiRequest<ActivityApi>(
    `/api/cursos/${cursoId}/atividades/${atividadeId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  );
}

export async function inativarAtividade(
  token: string,
  cursoId: string,
  atividadeId: string,
): Promise<ActivityApi> {
  return apiRequest<ActivityApi>(
    `/api/cursos/${cursoId}/atividades/${atividadeId}/inativar`,
    { method: 'POST' },
    token,
  );
}

export async function cancelarAtividade(
  token: string,
  cursoId: string,
  atividadeId: string,
): Promise<ActivityApi> {
  return apiRequest<ActivityApi>(
    `/api/cursos/${cursoId}/atividades/${atividadeId}/cancelar`,
    { method: 'POST' },
    token,
  );
}

export async function atribuirAtividades(
  token: string,
  cursoId: string,
  participanteId: string,
  atividadeIds: string[],
): Promise<InscricaoAtividadeResumo[]> {
  return apiRequest<InscricaoAtividadeResumo[]>(
    `/api/cursos/${cursoId}/inscritos/${participanteId}/atividades`,
    { method: 'POST', body: JSON.stringify({ atividade_ids: atividadeIds }) },
    token,
  );
}

export async function registrarPresenca(
  token: string,
  cursoId: string,
  atividadeId: string,
  participanteId: string,
  status: 'presente' | 'ausente',
): Promise<void> {
  await apiRequest(
    `/api/cursos/${cursoId}/atividades/${atividadeId}/presenca`,
    {
      method: 'POST',
      body: JSON.stringify({ participante_id: participanteId, status }),
    },
    token,
  );
}

export async function listAtividadesParticipante(
  token: string,
  cursoId: string,
): Promise<ParticipantActivitiesApi> {
  return apiRequest<ParticipantActivitiesApi>(
    `/api/participante/cursos/${cursoId}/atividades`,
    { method: 'GET' },
    token,
  );
}

export async function selecionarAtividadesParticipante(
  token: string,
  cursoId: string,
  atividadeIds: string[],
): Promise<ParticipantActivitiesApi> {
  return apiRequest<ParticipantActivitiesApi>(
    `/api/participante/cursos/${cursoId}/atividades`,
    { method: 'PUT', body: JSON.stringify({ atividade_ids: atividadeIds }) },
    token,
  );
}
