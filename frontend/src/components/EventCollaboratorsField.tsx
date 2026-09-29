import React from 'react';
import { useT } from '../i18n';
import { formatDateBr } from '../lib/dateBr';
import {
  COLLABORATOR_ROLES,
  CollaboratorDisplay,
  CollaboratorFieldErrors,
  EventCollaborator,
  MAX_COLLABORATORS,
  emptyCollaborator,
  moveCollaborator,
} from '../lib/colaboradores';

interface EventCollaboratorsFieldProps {
  people: EventCollaborator[];
  eventDates: string[];
  display: CollaboratorDisplay;
  errors: Record<number, CollaboratorFieldErrors>;
  onPeopleChange: (people: EventCollaborator[]) => void;
  onDisplayChange: (display: CollaboratorDisplay) => void;
  disabled?: boolean;
}

const fieldClass =
  'w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500';

export const EventCollaboratorsField: React.FC<EventCollaboratorsFieldProps> = ({
  people,
  eventDates,
  display,
  errors,
  onPeopleChange,
  onDisplayChange,
  disabled = false,
}) => {
  const { t } = useT();

  const update = (index: number, patch: Partial<EventCollaborator>) => {
    onPeopleChange(
      people.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  };

  const toggleDate = (index: number, day: string) => {
    const current = people[index]?.datasEvento ?? [];
    const next = current.includes(day)
      ? current.filter((item) => item !== day)
      : [...current, day].sort();
    update(index, { datasEvento: next });
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
          {t('collaborators.section')}
        </h3>
        <p className="mt-1 text-[11px] text-slate-500">{t('collaborators.hint')}</p>
      </div>

      {people.length === 0 && (
        <p className="text-sm text-slate-500">{t('collaborators.empty')}</p>
      )}

      <div className="space-y-3">
        {people.map((person, index) => {
          const fieldErrors = errors[index] ?? {};
          return (
            <article
              key={`${index}-${person.ordem}`}
              className="rounded-lg border border-slate-200 bg-white p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {index + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={disabled || index === 0}
                    onClick={() => onPeopleChange(moveCollaborator(people, index, -1))}
                    className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30"
                    aria-label={t('collaborators.moveUp')}
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                  </button>
                  <button
                    type="button"
                    disabled={disabled || index === people.length - 1}
                    onClick={() => onPeopleChange(moveCollaborator(people, index, 1))}
                    className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30"
                    aria-label={t('collaborators.moveDown')}
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      onPeopleChange(
                        people
                          .filter((_, itemIndex) => itemIndex !== index)
                          .map((item, ordem) => ({ ...item, ordem })),
                      )
                    }
                    className="p-1 text-rose-600 hover:text-rose-700 disabled:opacity-30"
                    aria-label={t('collaborators.remove')}
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-[11px] font-semibold text-slate-500 mb-1">
                    {t('collaborators.name')}
                  </span>
                  <input
                    type="text"
                    value={person.nome}
                    maxLength={255}
                    disabled={disabled}
                    placeholder={t('collaborators.namePlaceholder')}
                    onChange={(event) => update(index, { nome: event.target.value })}
                    className={fieldClass}
                  />
                  {fieldErrors.nome && (
                    <span className="mt-1 block text-xs text-rose-600">{fieldErrors.nome}</span>
                  )}
                </label>

                <label className="block">
                  <span className="block text-[11px] font-semibold text-slate-500 mb-1">
                    {t('collaborators.role')}
                  </span>
                  <select
                    value={person.funcao}
                    disabled={disabled}
                    onChange={(event) =>
                      update(index, {
                        funcao: event.target.value as EventCollaborator['funcao'],
                        funcaoPersonalizada:
                          event.target.value === 'outra' ? person.funcaoPersonalizada : '',
                      })
                    }
                    className={fieldClass}
                  >
                    {COLLABORATOR_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {t(`collaborators.roles.${role}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {person.funcao === 'outra' && (
                <label className="block">
                  <span className="block text-[11px] font-semibold text-slate-500 mb-1">
                    {t('collaborators.roleCustom')}
                  </span>
                  <input
                    type="text"
                    value={person.funcaoPersonalizada}
                    maxLength={80}
                    disabled={disabled}
                    placeholder={t('collaborators.roleCustomPlaceholder')}
                    onChange={(event) =>
                      update(index, { funcaoPersonalizada: event.target.value })
                    }
                    className={fieldClass}
                  />
                  {fieldErrors.funcaoPersonalizada && (
                    <span className="mt-1 block text-xs text-rose-600">
                      {fieldErrors.funcaoPersonalizada}
                    </span>
                  )}
                </label>
              )}

              <label className="block">
                <span className="block text-[11px] font-semibold text-slate-500 mb-1">
                  {t('collaborators.topic')}
                </span>
                <input
                  type="text"
                  value={person.temaAtividade}
                  maxLength={180}
                  disabled={disabled}
                  placeholder={t('collaborators.topicPlaceholder')}
                  onChange={(event) => update(index, { temaAtividade: event.target.value })}
                  className={fieldClass}
                />
              </label>

              <div>
                <span className="block text-[11px] font-semibold text-slate-500 mb-1">
                  {t('collaborators.dates')}
                </span>
                {eventDates.length === 0 ? (
                  <p className="text-xs text-slate-500">{t('collaborators.noDatesYet')}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {eventDates.map((day) => {
                      const selected = person.datasEvento.includes(day);
                      return (
                        <label
                          key={day}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                            selected
                              ? 'border-blue-300 bg-blue-50 text-blue-800'
                              : 'border-slate-200 bg-slate-50 text-slate-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={disabled}
                            onChange={() => toggleDate(index, day)}
                          />
                          {formatDateBr(day)}
                        </label>
                      );
                    })}
                  </div>
                )}
                <p className="mt-1 text-[11px] text-slate-500">{t('collaborators.datesHint')}</p>
              </div>
            </article>
          );
        })}
      </div>

      <button
        type="button"
        disabled={disabled || people.length >= MAX_COLLABORATORS}
        onClick={() => onPeopleChange([...people, emptyCollaborator(people.length)])}
        className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-40"
      >
        <span className="material-symbols-outlined text-[18px]">person_add</span>
        {t('collaborators.add')}
      </button>

      <label className="block">
        <span className="block text-[11px] font-semibold text-slate-500 mb-1">
          {t('collaborators.display')}
        </span>
        <select
          value={display}
          disabled={disabled}
          onChange={(event) => onDisplayChange(event.target.value as CollaboratorDisplay)}
          className={fieldClass}
        >
          <option value="automatico">{t('collaborators.displayAuto')}</option>
          <option value="somente_verso">{t('collaborators.displayBack')}</option>
          <option value="nao_exibir">{t('collaborators.displayHidden')}</option>
        </select>
        {display === 'automatico' && (
          <span className="mt-1 block text-[11px] text-slate-500">
            {t('collaborators.displayAutoHint')}
          </span>
        )}
      </label>

    </section>
  );
};
