import { EventItem } from '../types';

function statusRank(status: EventItem['status']): number {
  if (status === 'Upcoming') return 0;
  if (status === 'Completed') return 1;
  if (status === 'Draft') return 2;
  return 3;
}

function eventTime(event: EventItem): number {
  const raw = event.eventDates[0] || event.date;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

/** Próximos primeiro (data mais próxima no topo); concluídos depois, do mais recente ao mais antigo. */
export function compareCatalogEvents(a: EventItem, b: EventItem): number {
  const byStatus = statusRank(a.status) - statusRank(b.status);
  if (byStatus !== 0) return byStatus;

  const aTime = eventTime(a);
  const bTime = eventTime(b);
  if (aTime !== bTime) {
    return a.status === 'Completed' ? bTime - aTime : aTime - bTime;
  }
  return a.title.localeCompare(b.title, 'pt-BR');
}

export type CatalogStatusFilter = 'all' | 'Upcoming' | 'Completed';

export function visibleCatalogEvents(
  events: EventItem[],
  statusFilter: CatalogStatusFilter,
  category: string,
): EventItem[] {
  return [...events].sort(compareCatalogEvents).filter((event) => {
    if (statusFilter !== 'all' && event.status !== statusFilter) return false;
    if (category === 'all') return true;
    return event.category === category;
  });
}
