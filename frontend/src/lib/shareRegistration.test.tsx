import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ShareRegistrationLink } from '../components/ShareRegistrationLink';
import { LocaleProvider } from '../i18n';
import { registrationShareMessage, telegramShareUrl, whatsappShareUrl } from './shareRegistration';

describe('links de compartilhamento da inscrição', () => {
  it('monta WhatsApp e Telegram com o título e a URL da página', () => {
    const message = registrationShareMessage('Inscreva-se: Oficina', 'https://certify.example/eventos/1');
    expect(whatsappShareUrl(message)).toBe(
      'https://wa.me/?text=Inscreva-se%3A%20Oficina%0Ahttps%3A%2F%2Fcertify.example%2Feventos%2F1',
    );
    expect(telegramShareUrl('https://certify.example/eventos/1', 'Inscreva-se: Oficina')).toBe(
      'https://t.me/share/url?url=https%3A%2F%2Fcertify.example%2Feventos%2F1&text=Inscreva-se%3A+Oficina',
    );
  });

  it('expõe um botão para compartilhar a página de inscrição', () => {
    const html = renderToStaticMarkup(
      <LocaleProvider>
        <ShareRegistrationLink title="Oficina" />
      </LocaleProvider>,
    );
    expect(html).toContain('Compartilhar');
    expect(html).toContain('aria-haspopup="menu"');
  });
});
