import { describe, expect, it, vi } from 'vitest';
import {
  COVER_MAX_BYTES,
  DEFAULT_EVENT_COVER,
  applyCoverAfterSave,
  coverObjectPosition,
  resolveCoverSrc,
  validateCoverFile,
} from './eventCover';

describe('capa do evento', () => {
  it('usa a capa personalizada, a padrão e o fallback de erro', () => {
    expect(resolveCoverSrc('https://cdn.example/capa.webp', false)).toBe(
      'https://cdn.example/capa.webp',
    );
    expect(resolveCoverSrc(null, false)).toBe(DEFAULT_EVENT_COVER);
    expect(resolveCoverSrc(undefined, false)).toBe(DEFAULT_EVENT_COVER);
    expect(resolveCoverSrc('https://cdn.example/capa.webp', true)).toBe(DEFAULT_EVENT_COVER);
  });

  it('posiciona o foco e centraliza quando ele não existe', () => {
    expect(coverObjectPosition(0.2, 0.8)).toBe('20% 80%');
    expect(coverObjectPosition(null, null)).toBe('50% 50%');
  });

  it('rejeita extensão, mime e tamanho no navegador', () => {
    expect(validateCoverFile({ name: 'foto.jpg', type: 'image/jpeg', size: 1200 })).toBeNull();
    expect(validateCoverFile({ name: 'foto.gif', type: 'image/gif', size: 1200 })).toBe('type');
    expect(validateCoverFile({ name: 'foto.jpg', type: 'image/png', size: 1200 })).toBe('type');
    expect(validateCoverFile({ name: 'foto.jpg', type: 'image/jpeg', size: 0 })).toBe('type');
    expect(
      validateCoverFile({ name: 'foto.jpg', type: 'image/jpeg', size: COVER_MAX_BYTES + 1 }),
    ).toBe('size');
  });

  it('mantém o evento criado quando o upload da capa falha', async () => {
    const saved = { id: 'evt-1', titulo: 'Oficina' };
    const result = await applyCoverAfterSave({
      saved,
      file: new File([new Uint8Array([1, 2, 3])], 'capa.jpg', { type: 'image/jpeg' }),
      removeRequested: false,
      hasExisting: false,
      upload: vi.fn().mockRejectedValue(new Error('storage')),
      removeCover: vi.fn(),
    });
    expect(result.coverFailed).toBe(true);
    expect(result.curso).toBe(saved);
  });

  it('não envia arquivo quando a seleção foi cancelada', async () => {
    const upload = vi.fn();
    const result = await applyCoverAfterSave({
      saved: { id: 'evt-2' },
      file: null,
      removeRequested: false,
      hasExisting: false,
      upload,
      removeCover: vi.fn(),
    });
    expect(upload).not.toHaveBeenCalled();
    expect(result.coverFailed).toBe(false);
  });
});
