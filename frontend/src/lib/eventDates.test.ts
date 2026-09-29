import { describe, expect, it } from 'vitest';
import {
  addSpecificDate,
  expandPeriod,
  formatEventDateSentence,
} from './eventDates';

describe('datas do evento', () => {
  it('formata um dia, um período e dias específicos em português', () => {
    expect(formatEventDateSentence(['2026-05-20'], 'pt-BR')).toBe(
      'O evento foi realizado em 20/05/2026.',
    );
    expect(formatEventDateSentence(
      ['2026-05-20', '2026-05-21', '2026-05-22', '2026-05-23', '2026-05-24', '2026-05-25'],
      'pt-BR',
    )).toBe('O evento foi realizado de 20/05/2026 a 25/05/2026.');
    expect(formatEventDateSentence(
      ['2026-05-20', '2026-05-22', '2026-05-23', '2026-05-25'],
      'pt-BR',
    )).toBe(
      'O evento foi realizado nos dias 20/05/2026, 22/05/2026, 23/05/2026 e 25/05/2026.',
    );
  });

  it('impede data final anterior à inicial', () => {
    expect(expandPeriod('2026-05-25', '2026-05-20')).toEqual({ error: 'endBeforeStart' });
  });

  it('impede duplicidade no modo de dias específicos', () => {
    expect(addSpecificDate(['2026-05-20'], '2026-05-20')).toEqual({ error: 'duplicate' });
  });

  it('a revisão usa a frase completa, inclusive com datas fora de ordem', () => {
    const period = expandPeriod('2026-05-20', '2026-05-25');
    expect('dates' in period).toBe(true);
    if (!('dates' in period)) return;
    const review = formatEventDateSentence([...period.dates].reverse(), 'pt-BR');
    expect(review).toBe('O evento foi realizado de 20/05/2026 a 25/05/2026.');
  });
});
