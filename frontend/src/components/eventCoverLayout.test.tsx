import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '../i18n';
import { EventItem } from '../types';
import { EventsCatalogView } from './EventsCatalogView';
import { DEFAULT_EVENT_COVER } from '../lib/eventCover';

function event(partial: Partial<EventItem> & Pick<EventItem, 'id' | 'title'>): EventItem {
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
    description: 'Descrição',
    status: 'Upcoming',
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

describe('layout do diretório', () => {
  it('mantém 16:9, fallback local e prioridade só nos primeiros cartões', () => {
    const events = [
      event({ id: 'sem-capa', title: 'Sem capa' }),
      event({
        id: 'horizontal',
        title: 'Horizontal',
        coverCardUrl: 'https://files.example/capa-card-horizontal.webp',
        coverFocusX: 0.2,
        coverFocusY: 0.4,
      }),
      event({
        id: 'vertical',
        title: 'Vertical',
        coverCardUrl: 'https://files.example/capa-card-vertical.webp',
      }),
      event({
        id: 'texto',
        title: 'Com texto',
        coverCardUrl: 'https://files.example/capa-card-texto.webp',
      }),
    ];

    const html = renderToStaticMarkup(
      <LocaleProvider>
        <EventsCatalogView events={events} onSelectRegister={() => undefined} />
      </LocaleProvider>,
    );

    expect(html).toContain('grid-cols-1 md:grid-cols-2 lg:grid-cols-3');
    expect(html.match(/aspect-video/g)?.length).toBe(4);
    expect(html.match(/object-cover/g)?.length).toBe(4);
    expect(html).toContain(DEFAULT_EVENT_COVER);
    expect(html).toContain('https://files.example/capa-card-horizontal.webp');
    expect(html).toContain('object-position:20% 40%');
    expect(html).toContain('loading="eager"');
    expect(html).toContain('loading="lazy"');
    expect(html).not.toContain('googleusercontent');
    expect(html).not.toContain('lh3.google');
  });
});
