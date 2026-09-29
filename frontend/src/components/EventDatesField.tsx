import React, { useEffect, useState } from 'react';
import { useT } from '../i18n';
import { formatDateBr } from '../lib/dateBr';
import {
  EventDateError,
  EventDateMode,
  addSpecificDate,
  expandPeriod,
  inferDateMode,
  isConsecutive,
  removeEventDate,
} from '../lib/eventDates';
import { DateField } from './DateField';

interface EventDatesFieldProps {
  dates: string[];
  onChange: (dates: string[]) => void;
  disabled?: boolean;
}

function errorMessage(
  t: (path: string) => string,
  error: EventDateError | null,
): string | null {
  if (error === 'endBeforeStart') return t('createEvent.endBeforeStart');
  if (error === 'duplicate') return t('createEvent.duplicateDate');
  if (error === 'tooMany') return t('createEvent.tooManyDates');
  if (error === 'invalid') return t('createEvent.invalidDate');
  return null;
}

export const EventDatesField: React.FC<EventDatesFieldProps> = ({
  dates,
  onChange,
  disabled = false,
}) => {
  const { t } = useT();
  const bounds = (values: string[]) => {
    if (values.length === 0) return { start: '', end: '' };
    if (values.length === 1 || isConsecutive(values)) {
      return { start: values[0], end: values[values.length - 1] };
    }
    return { start: '', end: '' };
  };
  const initialBounds = bounds(dates);
  const [mode, setMode] = useState<EventDateMode>(() => inferDateMode(dates));
  const [start, setStart] = useState(initialBounds.start);
  const [end, setEnd] = useState(initialBounds.end);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<EventDateError | null>(null);

  useEffect(() => {
    if (mode !== 'periodo') return;
    const next = bounds(dates);
    setStart(next.start);
    setEnd(next.end);
  }, [dates, mode]);

  const applyPeriod = (nextStart: string, nextEnd: string) => {
    setStart(nextStart);
    setEnd(nextEnd);
    if (!nextStart || !nextEnd) {
      setError(null);
      return;
    }
    const result = expandPeriod(nextStart, nextEnd);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setError(null);
    onChange(result.dates);
  };

  const switchMode = (next: EventDateMode) => {
    setMode(next);
    setError(null);
    setDraft('');
    if (next === 'periodo') {
      const nextBounds = bounds(dates);
      setStart(nextBounds.start);
      setEnd(nextBounds.end);
    }
  };

  const addDraft = () => {
    const result = addSpecificDate(dates, draft);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setError(null);
    setDraft('');
    onChange(result.dates);
  };

  const message = errorMessage(t, error);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
          {t('createEvent.eventDates')}
        </label>
        <div className="inline-flex rounded-md border border-slate-200 overflow-hidden">
          <button
            type="button"
            disabled={disabled}
            onClick={() => switchMode('periodo')}
            className={`px-3 py-1.5 text-xs font-semibold ${
              mode === 'periodo' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'
            }`}
          >
            {t('createEvent.modePeriod')}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => switchMode('dias')}
            className={`px-3 py-1.5 text-xs font-semibold ${
              mode === 'dias' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'
            }`}
          >
            {t('createEvent.modeDays')}
          </button>
        </div>
      </div>

      {mode === 'periodo' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              {t('createEvent.startDate')}
            </label>
            <DateField
              value={start}
              disabled={disabled}
              onChange={(value) => applyPeriod(value, end)}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              {t('createEvent.endDate')}
            </label>
            <DateField
              value={end}
              disabled={disabled}
              onChange={(value) => applyPeriod(start, value)}
            />
          </div>
        </div>
      ) : (
        <div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <DateField value={draft} disabled={disabled} onChange={setDraft} />
            </div>
            <button
              type="button"
              disabled={disabled || !draft}
              onClick={addDraft}
              className="px-4 py-2.5 bg-slate-900 text-white rounded-md text-sm font-semibold disabled:opacity-50"
            >
              {t('createEvent.addDate')}
            </button>
          </div>
          {dates.length > 0 && (
            <ul className="mt-3 space-y-1">
              {dates.map((iso) => (
                <li
                  key={iso}
                  className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-slate-800">{formatDateBr(iso)}</span>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(removeEventDate(dates, iso))}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                  >
                    {t('createEvent.removeDate')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {message && <p className="mt-2 text-xs text-rose-600">{message}</p>}
    </div>
  );
};
