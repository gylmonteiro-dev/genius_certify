import React, { useEffect, useRef, useState } from 'react';
import { formatDateBr, maskDateBr, parseDateBr } from '../lib/dateBr';
import { useT } from '../i18n';

interface DateFieldProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (isoDate: string) => void;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
}

export const DateField: React.FC<DateFieldProps> = ({
  id,
  name,
  value,
  onChange,
  className = 'w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
  required = false,
  disabled = false,
  autoComplete = 'off',
}) => {
  const { t } = useT();
  const pickerRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => (value ? formatDateBr(value) : ''));
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    setText(value ? formatDateBr(value) : '');
  }, [value]);

  const emit = (isoDate: string) => {
    lastEmitted.current = isoDate;
    onChange(isoDate);
  };

  const handleChange = (raw: string) => {
    const masked = maskDateBr(raw);
    setText(masked);
    if (!masked) {
      emit('');
      return;
    }
    emit(parseDateBr(masked) ?? '');
  };

  const applyIso = (isoDate: string) => {
    setText(isoDate ? formatDateBr(isoDate) : '');
    emit(isoDate);
  };

  const openPicker = () => {
    const el = pickerRef.current;
    if (!el || disabled) return;
    try {
      if (typeof el.showPicker === 'function') {
        el.showPicker();
        return;
      }
    } catch {
      // fallback below
    }
    el.focus();
    el.click();
  };

  return (
    <div className="relative w-full">
      <input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete={autoComplete}
        placeholder="dd/mm/yyyy"
        maxLength={10}
        minLength={required ? 10 : undefined}
        required={required}
        disabled={disabled}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        className={className}
        style={{ paddingRight: '2.5rem' }}
      />
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        value={value}
        onChange={(e) => applyIso(e.target.value)}
        className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
        style={{ left: 0, top: 0 }}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={openPicker}
        aria-label={t('common.pickDate')}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-600 disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-[18px]">calendar_today</span>
      </button>
    </div>
  );
};
