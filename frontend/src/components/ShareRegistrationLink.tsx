import React, { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';
import {
  registrationShareMessage,
  telegramShareUrl,
  whatsappShareUrl,
} from '../lib/shareRegistration';

interface ShareRegistrationLinkProps {
  title: string;
}

export const ShareRegistrationLink: React.FC<ShareRegistrationLinkProps> = ({ title }) => {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const pageUrl = () => window.location.href;

  const openShareWindow = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  const copyLink = async (message: string) => {
    const url = pageUrl();
    try {
      await navigator.clipboard.writeText(url);
      setNotice(message);
    } catch {
      setNotice(url);
    }
    setOpen(false);
  };

  const shareWhatsapp = () => {
    const url = pageUrl();
    openShareWindow(whatsappShareUrl(registrationShareMessage(t('registration.shareText', { title }), url)));
  };

  const shareTelegram = () => {
    openShareWindow(telegramShareUrl(pageUrl(), t('registration.shareText', { title })));
  };

  const shareInstagram = async () => {
    const url = pageUrl();
    const text = t('registration.shareText', { title });
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // O compartilhamento nativo ainda pode levar o link.
    }
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url });
        setNotice(t('registration.shareInstagramCopied'));
        setOpen(false);
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setOpen(false);
          return;
        }
      }
    }
    setNotice(t('registration.shareInstagramCopied'));
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative flex flex-col items-end">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
      >
        <span className="material-symbols-outlined text-[16px] text-blue-600">share</span>
        {t('registration.share')}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={shareWhatsapp}
            className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            {t('registration.shareWhatsapp')}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={shareTelegram}
            className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            {t('registration.shareTelegram')}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => void shareInstagram()}
            className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            {t('registration.shareInstagram')}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => void copyLink(t('registration.shareCopied'))}
            className="flex w-full items-center border-t border-slate-100 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            {t('registration.shareCopy')}
          </button>
        </div>
      )}
      {notice && (
        <p className="mt-1 max-w-56 text-right text-xs text-emerald-700" role="status">
          {notice}
        </p>
      )}
    </div>
  );
};
