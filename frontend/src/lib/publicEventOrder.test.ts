import { describe, expect, it } from 'vitest';
import { EventItem } from '../types';
import { visibleCatalogEvents } from './publicEventOrder';

function event(partial: Partial<EventItem> & Pick<EventItem, 'id' | 'title' | 'status'>): EventItem {
  return {
    category: 'tech',
    type: 'workshop',
    modality: 'online',
    date: '2026-10-24',
    dateMonth: 'OCTOBER',
    dateDay: '24',
    eventDates: ['2026-10-24'],
    time: '',
    durationHours: 8,
    instructor: '',
    collaborators: [],
    collaboratorDisplay: 'automatico',
    institutionId: 'inst-1',
    institutionName: 'Nexus',
    description: '',
    exigirConclusaoParaEmitir: true,
    emissaoLiberada: false,
    templateId: 'classic',
    frenteTipo: 'conclusao',
    frenteTitulo: '',
    frenteAtestacao: '',
    versoParcerias: '',
    versoConteudos: '',
    versoObservacoes: '',
    cancelamentoJustificativa: '',
    canceladoEm: null,
    ...partial,
  };
}

describe('visibleCatalogEvents', () => {
  const events = [
    event({
      id: 'old',
      title: 'Antigo',
      status: 'Completed',
      date: '2025-01-01',
      eventDates: ['2025-01-01'],
    }),
    event({
      id: 'recent',
      title: 'Recente',
      status: 'Completed',
      date: '2026-03-01',
      eventDates: ['2026-03-01'],
    }),
    event({
      id: 'later',
      title: 'Mais tarde',
      status: 'Upcoming',
      date: '2026-12-01',
      eventDates: ['2026-12-01'],
    }),
    event({
      id: 'sooner',
      title: 'Mais cedo',
      status: 'Upcoming',
      date: '2026-06-01',
      eventDates: ['2026-06-01'],
    }),
  ];

  it('coloca próximos primeiro, do mais perto para o mais distante', () => {
    expect(visibleCatalogEvents(events, 'all', 'all').map((item) => item.id)).toEqual([
      'sooner',
      'later',
      'recent',
      'old',
    ]);
  });

  it('filtra por status sem misturar a categoria', () => {
    expect(visibleCatalogEvents(events, 'Upcoming', 'all').map((item) => item.id)).toEqual([
      'sooner',
      'later',
    ]);
    expect(visibleCatalogEvents(events, 'Completed', 'tech').map((item) => item.id)).toEqual([
      'recent',
      'old',
    ]);
    expect(visibleCatalogEvents(events, 'Upcoming', 'outra')).toEqual([]);
  });
});
