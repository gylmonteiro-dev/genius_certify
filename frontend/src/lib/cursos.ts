import { EventItem, Institution } from '../types';
import { apiRequest } from './api';
import {
  CollaboratorApi,
  CollaboratorDisplay,
  collaboratorsFromApi,
} from './colaboradores';
import { normalizeEventDates } from './eventDates';
import { ParticipanteApiStatus } from './participantes';
import { CertificadoApiStatus } from './certificados';
import { ActivityPublicApi, InscricaoAtividadeResumo, responsibleLabel } from './atividades';

export type CursoApiStatus = 'draft' | 'upcoming' | 'completed' | 'cancelled';

export interface CursoApi {
  id: string;
  instituicao_id: string;
  titulo: string;
  descricao: string;
  carga_horaria: number;
  instrutor: string;
  colaboradores?: CollaboratorApi[];
  exibicao_colaboradores?: CollaboratorDisplay;
  status: CursoApiStatus;
  data_evento: string | null;
  datas_evento?: string[];
  categoria: string | null;
  modalidade: string | null;
  tipo: string | null;
  exigir_conclusao_para_emitir: boolean;
  emissao_liberada: boolean;
  template_id?: string;
  frente_tipo?: string | null;
  frente_titulo?: string | null;
  frente_atestacao?: string | null;
  verso_parcerias?: string | null;
  verso_conteudos?: string | null;
  verso_observacoes?: string | null;
  limite_participantes?: number | null;
  permite_varias_atividades?: boolean;
  atividade_obrigatoria?: boolean;
  permitir_selecao_participante?: boolean;
  selecao_atividades_ate?: string | null;
  certificado_exige_presenca_atividade?: boolean;
  capa_card_url?: string | null;
  capa_detail_url?: string | null;
  capa_foco_x?: number | null;
  capa_foco_y?: number | null;
  cancelamento_justificativa?: string | null;
  cancelado_em?: string | null;
  created_at: string;
  updated_at: string;
  certificados_atualizados?: number;
}

export interface CursoPublicApi {
  id: string;
  titulo: string;
  descricao: string;
  carga_horaria: number;
  instrutor: string;
  colaboradores?: CollaboratorApi[];
  exibicao_colaboradores?: CollaboratorDisplay;
  status: CursoApiStatus;
  instituicao_nome: string;
  data_evento: string | null;
  datas_evento?: string[];
  categoria: string | null;
  modalidade: string | null;
  tipo: string | null;
  verso_parcerias?: string | null;
  verso_conteudos?: string | null;
  verso_observacoes?: string | null;
  limite_participantes?: number | null;
  vagas_disponiveis?: number | null;
  permite_varias_atividades?: boolean;
  atividade_obrigatoria?: boolean;
  permitir_selecao_participante?: boolean;
  selecao_atividades_ate?: string | null;
  certificado_exige_presenca_atividade?: boolean;
  atividades?: ActivityPublicApi[];
  capa_card_url?: string | null;
  capa_detail_url?: string | null;
  capa_foco_x?: number | null;
  capa_foco_y?: number | null;
}

export interface CursoCreatePayload {
  titulo: string;
  descricao?: string;
  carga_horaria: number;
  instrutor?: string;
  colaboradores?: CollaboratorApi[];
  exibicao_colaboradores?: CollaboratorDisplay;
  status?: CursoApiStatus;
  data_evento?: string | null;
  datas_evento?: string[];
  categoria?: string | null;
  modalidade?: string | null;
  tipo?: string | null;
  exigir_conclusao_para_emitir?: boolean;
  template_id?: string;
  frente_tipo?: string | null;
  frente_titulo?: string | null;
  frente_atestacao?: string | null;
  verso_parcerias?: string | null;
  verso_conteudos?: string | null;
  verso_observacoes?: string | null;
  limite_participantes?: number | null;
  permite_varias_atividades?: boolean;
  atividade_obrigatoria?: boolean;
  permitir_selecao_participante?: boolean;
  selecao_atividades_ate?: string | null;
  certificado_exige_presenca_atividade?: boolean;
  instituicao_id?: string;
}

export type CursoUpdatePayload = Omit<CursoCreatePayload, 'instituicao_id'> & {
  atualizar_certificados_emitidos?: boolean;
};

export type EventPublicVisibility =
  | 'open'
  | 'hidden_draft'
  | 'hidden_completed'
  | 'hidden_cancelled'
  | 'hidden_institution';

const UI_TO_API_STATUS: Record<EventItem['status'], CursoApiStatus> = {
  Draft: 'draft',
  Upcoming: 'upcoming',
  Completed: 'completed',
  Cancelled: 'cancelled',
};

const API_TO_UI_STATUS: Record<CursoApiStatus, EventItem['status']> = {
  draft: 'Draft',
  upcoming: 'Upcoming',
  completed: 'Completed',
  cancelled: 'Cancelled',
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
  colaboradores?: CollaboratorApi[];
  exibicao_colaboradores?: CollaboratorDisplay;
  status: CursoApiStatus;
  data_evento: string | null;
  datas_evento?: string[];
  categoria: string | null;
  modalidade: string | null;
  tipo: string | null;
  created_at?: string;
  instituicaoId: string;
  institutionName: string;
  exigir_conclusao_para_emitir?: boolean;
  emissao_liberada?: boolean;
  template_id?: string;
  frente_tipo?: string | null;
  frente_titulo?: string | null;
  frente_atestacao?: string | null;
  verso_parcerias?: string | null;
  verso_conteudos?: string | null;
  verso_observacoes?: string | null;
  limite_participantes?: number | null;
  vagas_disponiveis?: number | null;
  capa_card_url?: string | null;
  capa_detail_url?: string | null;
  capa_foco_x?: number | null;
  capa_foco_y?: number | null;
  cancelamento_justificativa?: string | null;
  cancelado_em?: string | null;
  permite_varias_atividades?: boolean;
  atividade_obrigatoria?: boolean;
  permitir_selecao_participante?: boolean;
  selecao_atividades_ate?: string | null;
  certificado_exige_presenca_atividade?: boolean;
  atividades?: ActivityPublicApi[];
}): EventItem {
  const eventDates = normalizeEventDates(
    item.datas_evento?.length ? item.datas_evento : [item.data_evento],
  );
  const parts = dateParts(eventDates[0] ?? item.created_at);
  return {
    id: item.id,
    title: item.titulo,
    category: item.categoria ?? '',
    type: item.tipo ?? '',
    modality: item.modalidade ?? '',
    date: parts.date,
    dateMonth: parts.dateMonth,
    dateDay: parts.dateDay,
    eventDates,
    time: '',
    durationHours: item.carga_horaria,
    instructor: item.instrutor,
    collaborators: collaboratorsFromApi(item.colaboradores, item.instrutor),
    collaboratorDisplay: item.exibicao_colaboradores ?? 'automatico',
    institutionId: item.instituicaoId,
    institutionName: item.institutionName,
    description: item.descricao || '—',
    limiteParticipantes: item.limite_participantes ?? null,
    bannerImage: item.capa_card_url || undefined,
    coverCardUrl: item.capa_card_url ?? null,
    coverDetailUrl: item.capa_detail_url ?? null,
    coverFocusX: item.capa_foco_x ?? null,
    coverFocusY: item.capa_foco_y ?? null,
    spotsLeft:
      typeof item.vagas_disponiveis === 'number' ? item.vagas_disponiveis : undefined,
    status: API_TO_UI_STATUS[item.status],
    exigirConclusaoParaEmitir: item.exigir_conclusao_para_emitir ?? true,
    emissaoLiberada: item.emissao_liberada ?? false,
    templateId: item.template_id ?? 'classic',
    frenteTipo: item.frente_tipo === 'participacao' ? 'participacao' : 'conclusao',
    frenteTitulo: item.frente_titulo ?? '',
    frenteAtestacao: item.frente_atestacao ?? '',
    versoParcerias: item.verso_parcerias ?? '',
    versoConteudos: item.verso_conteudos ?? '',
    versoObservacoes: item.verso_observacoes ?? '',
    cancelamentoJustificativa: item.cancelamento_justificativa ?? '',
    canceladoEm: item.cancelado_em ?? null,
    permiteVariasAtividades: item.permite_varias_atividades ?? false,
    atividadeObrigatoria: item.atividade_obrigatoria ?? false,
    permitirSelecaoParticipante: item.permitir_selecao_participante ?? true,
    selecaoAtividadesAte: item.selecao_atividades_ate ?? null,
    certificadoExigePresencaAtividade: item.certificado_exige_presenca_atividade ?? false,
    atividades: (item.atividades ?? []).map((atividade) => ({
      id: atividade.id,
      titulo: atividade.titulo,
      descricao: atividade.descricao,
      tipo: atividade.tipo,
      tipoPersonalizado: atividade.tipo_personalizado ?? null,
      data: atividade.data,
      horaInicio: atividade.hora_inicio ?? null,
      horaFim: atividade.hora_fim ?? null,
      cargaHoraria: atividade.carga_horaria ?? null,
      local: atividade.local ?? null,
      limiteParticipantes: atividade.limite_participantes ?? null,
      vagasDisponiveis: atividade.vagas_disponiveis ?? null,
      lotada: atividade.lotada,
      responsaveis: responsibleLabel(atividade.responsaveis),
    })),
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
  if (status === 'Cancelled' || status === 'cancelled') return 'hidden_cancelled';
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

export async function uploadCursoCapa(
  token: string,
  cursoId: string,
  file: File,
  focoX: number,
  focoY: number,
): Promise<CursoApi> {
  const body = new FormData();
  body.append('file', file);
  body.append('foco_x', String(focoX));
  body.append('foco_y', String(focoY));
  return apiRequest<CursoApi>(`/api/cursos/${cursoId}/capa`, { method: 'POST', body }, token);
}

export async function deleteCursoCapa(token: string, cursoId: string): Promise<CursoApi> {
  return apiRequest<CursoApi>(`/api/cursos/${cursoId}/capa`, { method: 'DELETE' }, token);
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
  payload: Partial<CursoUpdatePayload>,
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
  inscricao_cancelada?: boolean;
  cancelada_justificativa?: string | null;
  inscricao_reprovada?: boolean;
  reprovada_justificativa?: string | null;
  atividades?: InscricaoAtividadeResumo[];
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

export async function aprovarInscrito(
  token: string,
  cursoId: string,
  participanteId: string,
): Promise<InscritoApi> {
  return apiRequest<InscritoApi>(
    `/api/cursos/${cursoId}/inscritos/${participanteId}/aprovar`,
    { method: 'POST' },
    token,
  );
}

export async function reprovarInscrito(
  token: string,
  cursoId: string,
  participanteId: string,
  justificativa: string,
): Promise<InscritoApi> {
  return apiRequest<InscritoApi>(
    `/api/cursos/${cursoId}/inscritos/${participanteId}/reprovar`,
    {
      method: 'POST',
      body: JSON.stringify({ justificativa }),
    },
    token,
  );
}

export async function removerInscrito(
  token: string,
  cursoId: string,
  participanteId: string,
  revogarCertificado: boolean,
): Promise<void> {
  await apiRequest(
    `/api/cursos/${cursoId}/inscritos/${participanteId}`,
    {
      method: 'DELETE',
      body: JSON.stringify({ revogar_certificado: revogarCertificado }),
    },
    token,
  );
}

export async function cancelarCurso(
  token: string,
  cursoId: string,
  justificativa: string,
): Promise<CursoApi> {
  return apiRequest<CursoApi>(
    `/api/cursos/${cursoId}/cancelar`,
    {
      method: 'POST',
      body: JSON.stringify({ justificativa: justificativa || null }),
    },
    token,
  );
}

export interface LoteItemErro {
  participante_id: string;
  mensagem: string;
}

export interface RevogarCertificadosLoteResult {
  revoked: number;
  skipped: number;
  errors: LoteItemErro[];
}

export async function revogarCertificadosLote(
  token: string,
  cursoId: string,
  participanteIds?: string[],
): Promise<RevogarCertificadosLoteResult> {
  return apiRequest<RevogarCertificadosLoteResult>(
    `/api/cursos/${cursoId}/certificados/revogar-lote`,
    {
      method: 'POST',
      body: JSON.stringify({
        participante_ids: participanteIds && participanteIds.length > 0 ? participanteIds : null,
      }),
    },
    token,
  );
}

export interface CancelarInscritosLoteResult {
  cancelled: number;
  skipped: number;
  revoked: number;
  errors: LoteItemErro[];
}

export async function cancelarInscritosLote(
  token: string,
  cursoId: string,
  participanteIds: string[],
  revogarCertificados: boolean,
  justificativa?: string,
): Promise<CancelarInscritosLoteResult> {
  return apiRequest<CancelarInscritosLoteResult>(
    `/api/cursos/${cursoId}/inscritos/cancelar-lote`,
    {
      method: 'POST',
      body: JSON.stringify({
        participante_ids: participanteIds,
        revogar_certificados: revogarCertificados,
        justificativa: justificativa || null,
      }),
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

export async function getCurso(token: string, cursoId: string): Promise<CursoApi> {
  return apiRequest<CursoApi>(`/api/cursos/${cursoId}`, { method: 'GET' }, token);
}

export async function listCursosPublicos(): Promise<CursoPublicApi[]> {
  return apiRequest<CursoPublicApi[]>('/api/publico/cursos', { method: 'GET' });
}

export async function getCursoPublico(id: string): Promise<CursoPublicApi> {
  return apiRequest<CursoPublicApi>(`/api/publico/cursos/${id}`, { method: 'GET' });
}

export async function inscreverCursoPublico(
  cursoId: string,
  payload: {
    nome: string;
    email: string;
    documento: string;
    data_nascimento: string;
    senha: string;
    atividade_id?: string | null;
    atividade_ids?: string[];
  },
): Promise<void> {
  await apiRequest(`/api/publico/cursos/${cursoId}/inscrever`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
