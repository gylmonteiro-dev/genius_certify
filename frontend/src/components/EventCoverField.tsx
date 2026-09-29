import React, { useEffect, useMemo, useRef } from 'react';
import { COVER_ACCEPT, coverObjectPosition, resolveCoverSrc, validateCoverFile } from '../lib/eventCover';
import { useT } from '../i18n';

interface EventCoverFieldProps {
  existingUrl?: string | null;
  file: File | null;
  removed: boolean;
  focusX: number;
  focusY: number;
  disabled?: boolean;
  onFile: (file: File) => void;
  onInvalid: (message: string) => void;
  onRemove: () => void;
  onCancelSelection: () => void;
  onFocus: (x: number, y: number) => void;
}

export const EventCoverField: React.FC<EventCoverFieldProps> = ({
  existingUrl,
  file,
  removed,
  focusX,
  focusY,
  disabled = false,
  onFile,
  onInvalid,
  onRemove,
  onCancelSelection,
  onFocus,
}) => {
  const { t } = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const remoteUrl = removed ? null : existingUrl;
  const src = previewUrl || resolveCoverSrc(remoteUrl, false);
  const hasCustom = Boolean(file || (remoteUrl && !removed));

  const pickFocus = (event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    onFocus(
      Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    );
  };

  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
        {t('createEvent.cover.title')}
      </label>
      <p className="text-[11px] text-slate-500 mb-3">{t('createEvent.cover.hint')}</p>
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
        <img
          src={src}
          alt={t('createEvent.cover.previewAlt')}
          width={640}
          height={360}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: coverObjectPosition(focusX, focusY) }}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={pickFocus}
          className="absolute inset-0 cursor-crosshair"
          aria-label={t('createEvent.cover.focusHint')}
        />
        <span
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${focusX * 100}%`, top: `${focusY * 100}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] text-slate-500">{t('createEvent.cover.focusHint')}</p>
      {!hasCustom && (
        <p className="mt-1 text-[11px] text-slate-500">{t('createEvent.cover.empty')}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="px-3 py-1.5 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          {hasCustom ? t('createEvent.cover.replace') : t('createEvent.cover.select')}
        </button>
        {file && (
          <button
            type="button"
            disabled={disabled}
            onClick={onCancelSelection}
            className="px-3 py-1.5 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t('createEvent.cover.cancelSelection')}
          </button>
        )}
        {hasCustom && (
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            className="px-3 py-1.5 rounded-md border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-50"
          >
            {t('createEvent.cover.remove')}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={COVER_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const next = event.target.files?.[0];
          event.target.value = '';
          if (!next) return;
          const error = validateCoverFile(next);
          if (error === 'size') {
            onInvalid(t('createEvent.cover.tooLarge'));
            return;
          }
          if (error === 'type') {
            onInvalid(t('createEvent.cover.invalidType'));
            return;
          }
          onFile(next);
        }}
      />
    </div>
  );
};
