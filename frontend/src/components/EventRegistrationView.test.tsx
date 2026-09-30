import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '../i18n';
import { EventItem } from '../types';
import { EventRegistrationView } from './EventRegistrationView';

function event(): EventItem {
  return {
    id: 'evt-1',
    title: 'Oficina',
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
  };
}

describe('card de inscrição pública', () => {
  it('coloca o acesso de quem já tem conta antes do formulário e exige senha', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <LocaleProvider>
          <EventRegistrationView
            event={event()}
            onSuccessRegister={() => undefined}
            onBack={() => undefined}
          />
        </LocaleProvider>
      </MemoryRouter>,
    );

    const login = html.indexOf('Já tem cadastro?');
    const divider = html.indexOf('Ainda não tem conta');
    const password = html.indexOf('>Senha<');
    expect(login).toBeGreaterThan(-1);
    expect(login).toBeLessThan(divider);
    expect(divider).toBeLessThan(password);
    expect(html).toContain('bg-blue-50');
    expect(html).toContain('/minhas-inscricoes/entrar?next=/eventos/evt-1');
    expect(html).toContain('minLength="8"');
    expect(html.toLowerCase()).not.toContain('opcional');
  });
});
