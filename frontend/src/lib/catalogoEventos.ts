import { apiRequest } from './api';

export type CatalogoEventoKind = 'categoria' | 'modalidade' | 'tipo';

export interface CatalogoEventoItem {
  id: string;
  kind: CatalogoEventoKind;
  slug: string;
  nome: string;
  nome_en: string;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface CatalogoEventoCreatePayload {
  kind: CatalogoEventoKind;
  nome: string;
  nome_en?: string;
  slug?: string;
  ordem?: number;
  ativo?: boolean;
}

export interface CatalogoEventoUpdatePayload {
  nome?: string;
  nome_en?: string;
  ordem?: number;
  ativo?: boolean;
}

export function catalogLabel(
  items: CatalogoEventoItem[],
  kind: CatalogoEventoKind,
  slug: string,
  locale: string,
): string {
  const item = items.find((entry) => entry.kind === kind && entry.slug === slug);
  if (!item) return slug;
  if (locale.startsWith('en') && item.nome_en.trim()) return item.nome_en;
  return item.nome;
}

export function catalogByKind(
  items: CatalogoEventoItem[],
  kind: CatalogoEventoKind,
  options?: { includeSlug?: string | null; onlyActive?: boolean },
): CatalogoEventoItem[] {
  const onlyActive = options?.onlyActive ?? true;
  const includeSlug = options?.includeSlug ?? null;
  return items.filter((item) => {
    if (item.kind !== kind) return false;
    if (onlyActive && !item.ativo && item.slug !== includeSlug) return false;
    return true;
  });
}

export async function listCatalogoEventos(
  token: string,
  kind?: CatalogoEventoKind,
): Promise<CatalogoEventoItem[]> {
  const query = kind ? `?kind=${encodeURIComponent(kind)}` : '';
  return apiRequest<CatalogoEventoItem[]>(`/api/catalogo-eventos${query}`, { method: 'GET' }, token);
}

export async function listCatalogoEventosPublico(
  kind?: CatalogoEventoKind,
): Promise<CatalogoEventoItem[]> {
  const query = kind ? `?kind=${encodeURIComponent(kind)}` : '';
  return apiRequest<CatalogoEventoItem[]>(`/api/publico/catalogo-eventos${query}`, {
    method: 'GET',
  });
}

export async function createCatalogoEvento(
  token: string,
  payload: CatalogoEventoCreatePayload,
): Promise<CatalogoEventoItem> {
  return apiRequest<CatalogoEventoItem>(
    '/api/catalogo-eventos',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export async function updateCatalogoEvento(
  token: string,
  id: string,
  payload: CatalogoEventoUpdatePayload,
): Promise<CatalogoEventoItem> {
  return apiRequest<CatalogoEventoItem>(
    `/api/catalogo-eventos/${id}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  );
}

export async function deactivateCatalogoEvento(
  token: string,
  id: string,
): Promise<CatalogoEventoItem> {
  return apiRequest<CatalogoEventoItem>(
    `/api/catalogo-eventos/${id}`,
    { method: 'DELETE' },
    token,
  );
}
