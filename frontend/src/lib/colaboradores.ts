export const COLLABORATOR_ROLES = [
  'instrutor',
  'palestrante',
  'facilitador',
  'mediador',
  'outra',
] as const;

export type CollaboratorRole = (typeof COLLABORATOR_ROLES)[number];

export const COLLABORATOR_DISPLAYS = [
  'automatico',
  'somente_verso',
  'nao_exibir',
] as const;

export type CollaboratorDisplay = (typeof COLLABORATOR_DISPLAYS)[number];

export const MAX_COLLABORATORS = 40;
export const FRONT_NAME_MAX = 40;

export interface EventCollaborator {
  nome: string;
  funcao: CollaboratorRole;
  funcaoPersonalizada: string;
  temaAtividade: string;
  ordem: number;
  datasEvento: string[];
}

export interface CollaboratorFieldErrors {
  nome?: string;
  funcaoPersonalizada?: string;
  temaAtividade?: string;
  datasEvento?: string;
}

export interface CollaboratorApi {
  id?: string;
  nome: string;
  funcao: CollaboratorRole;
  funcao_personalizada?: string | null;
  tema_atividade?: string | null;
  ordem: number;
  datas_evento?: string[];
}

export function emptyCollaborator(ordem = 0): EventCollaborator {
  return {
    nome: '',
    funcao: 'instrutor',
    funcaoPersonalizada: '',
    temaAtividade: '',
    ordem,
    datasEvento: [],
  };
}

export function collaboratorsFromApi(
  items: CollaboratorApi[] | null | undefined,
  legacyInstructor = '',
): EventCollaborator[] {
  if (items && items.length > 0) {
    return items
      .slice()
      .sort((a, b) => a.ordem - b.ordem)
      .map((item, index) => ({
        nome: item.nome,
        funcao: item.funcao,
        funcaoPersonalizada: item.funcao_personalizada ?? '',
        temaAtividade: item.tema_atividade ?? '',
        ordem: index,
        datasEvento: (item.datas_evento ?? []).map((value) => value.slice(0, 10)),
      }));
  }
  const legacy = legacyInstructor.trim();
  if (!legacy) return [];
  return [{ ...emptyCollaborator(0), nome: legacy }];
}

export function collaboratorsToApi(items: EventCollaborator[]): CollaboratorApi[] {
  return items.map((item, index) => ({
    nome: item.nome.trim(),
    funcao: item.funcao,
    funcao_personalizada:
      item.funcao === 'outra' ? item.funcaoPersonalizada.trim() : null,
    tema_atividade: item.temaAtividade.trim() || null,
    ordem: index,
    datas_evento: item.datasEvento,
  }));
}

export function moveCollaborator(
  items: EventCollaborator[],
  index: number,
  direction: -1 | 1,
): EventCollaborator[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = items.slice();
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next.map((person, ordem) => ({ ...person, ordem }));
}

export function pruneCollaboratorDates(
  items: EventCollaborator[],
  eventDates: string[],
): EventCollaborator[] {
  const allowed = new Set(eventDates);
  return items.map((item) => ({
    ...item,
    datasEvento: item.datasEvento.filter((day) => allowed.has(day)),
  }));
}

export function validateCollaborators(
  items: EventCollaborator[],
  eventDates: string[],
  t: (path: string, vars?: Record<string, string | number>) => string,
): Record<number, CollaboratorFieldErrors> {
  const errors: Record<number, CollaboratorFieldErrors> = {};
  const allowed = new Set(eventDates);
  items.forEach((item, index) => {
    const field: CollaboratorFieldErrors = {};
    if (!item.nome.trim()) field.nome = t('collaborators.nameRequired');
    if (item.funcao === 'outra' && !item.funcaoPersonalizada.trim()) {
      field.funcaoPersonalizada = t('collaborators.roleCustomRequired');
    }
    if (item.temaAtividade.trim().length > 180) {
      field.temaAtividade = t('collaborators.topic');
    }
    if (item.datasEvento.some((day) => !allowed.has(day))) {
      field.datasEvento = t('collaborators.datesHint');
    }
    if (Object.keys(field).length > 0) errors[index] = field;
  });
  return errors;
}

export function collaboratorNames(items: EventCollaborator[]): string {
  return items
    .map((item) => item.nome.trim())
    .filter(Boolean)
    .join(', ');
}

export function collaboratorsOnCertificateBack(
  items: EventCollaborator[],
  display: CollaboratorDisplay,
): boolean {
  const named = items.filter((item) => item.nome.trim());
  if (display === 'nao_exibir' || named.length === 0) return false;
  if (display === 'somente_verso') return true;
  if (named.length >= 2) return true;
  return named[0].nome.trim().length > FRONT_NAME_MAX;
}

export function roleLabel(
  t: (path: string) => string,
  item: Pick<EventCollaborator, 'funcao' | 'funcaoPersonalizada'>,
): string {
  if (item.funcao === 'outra') return item.funcaoPersonalizada.trim() || t('collaborators.roles.outra');
  return t(`collaborators.roles.${item.funcao}`);
}
