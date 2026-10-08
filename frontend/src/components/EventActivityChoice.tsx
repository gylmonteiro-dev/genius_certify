import React, { useEffect, useState } from 'react';
import { ApiError } from '../lib/api';
import {
  formatActivityHours,
  listAtividadesParticipante,
  ParticipantActivitiesApi,
  selecionarAtividadesParticipante,
} from '../lib/atividades';
import { formatDateBr } from '../lib/dateBr';
import { useT } from '../i18n';
import { EventActivityChoice, EventItem } from '../types';

export function selectionWindowOpen(
  event: Pick<EventItem, 'status' | 'permitirSelecaoParticipante' | 'selecaoAtividadesAte'>,
): boolean {
  if (event.permitirSelecaoParticipante === false) return false;
  if (event.status !== 'Upcoming') return false;
  if (!event.selecaoAtividadesAte) return true;
  const deadline = new Date(event.selecaoAtividadesAte);
  if (Number.isNaN(deadline.getTime())) return true;
  return Date.now() <= deadline.getTime();
}

function activityMeta(
  t: (path: string, vars?: Record<string, string | number>) => string,
  item: EventActivityChoice,
  includeDate = false,
): string {
  const tipo = item.tipo === 'outro' && item.tipoPersonalizado
    ? item.tipoPersonalizado
    : t(`activities.types.${item.tipo}`);
  const horario = [item.horaInicio, item.horaFim]
    .filter(Boolean)
    .map((value) => formatActivityHours(value))
    .join('–');
  const vagas =
    item.limiteParticipantes == null
      ? t('activities.unlimited')
      : item.vagasDisponiveis == null
        ? t('activities.occupied', { taken: '—', limit: item.limiteParticipantes })
        : t('activities.spotsLeft', { count: item.vagasDisponiveis });
  return [
    tipo,
    includeDate && item.data ? formatDateBr(item.data) : '',
    horario,
    item.cargaHoraria ? `${item.cargaHoraria}h` : '',
    item.local ?? '',
    item.responsaveis,
    item.lotada ? t('activities.full') : vagas,
  ]
    .filter(Boolean)
    .join(' · ');
}

function groupByDate(activities: EventActivityChoice[], eventDates: string[] = []) {
  const dates = eventDates.map((day) => day.slice(0, 10));
  const sorted = [...activities].sort((a, b) => {
    const byTime = (a.horaInicio || '').localeCompare(b.horaInicio || '');
    return byTime || a.titulo.localeCompare(b.titulo);
  });
  for (const item of sorted) {
    const day = (item.data || '').slice(0, 10);
    if (day && !dates.includes(day)) dates.push(day);
  }
  return dates
    .map((data) => ({
      data,
      items: sorted.filter((item) => (item.data || '').slice(0, 10) === data),
    }))
    .filter((group) => group.items.length > 0);
}

export const ActivityProgram: React.FC<{
  activities: EventActivityChoice[];
  eventDates?: string[];
}> = ({ activities, eventDates = [] }) => {
  const { t } = useT();
  const groups = groupByDate(activities, eventDates);
  if (groups.length === 0) return null;
  return (
    <div className="mt-6 space-y-4">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {t('activities.program')}
      </p>
      {groups.map((group) => (
        <div key={group.data}>
          <p className="text-xs font-semibold text-slate-700 mb-2">{formatDateBr(group.data)}</p>
          <ul className="space-y-3">
            {group.items.map((item) => (
              <li key={item.id}>
                <p className="font-semibold text-sm text-slate-900">{item.titulo}</p>
                {item.descricao && (
                  <p className="text-xs text-slate-500 mt-0.5">{item.descricao}</p>
                )}
                <p className="text-xs text-slate-500 mt-0.5">{activityMeta(t, item)}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

interface ActivityPickerProps {
  activities: EventActivityChoice[];
  eventDates?: string[];
  permiteVarias: boolean;
  obrigatoria: boolean;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export const ActivityPicker: React.FC<ActivityPickerProps> = ({
  activities,
  eventDates = [],
  permiteVarias,
  obrigatoria,
  selectedIds,
  onChange,
  disabled = false,
}) => {
  const { t } = useT();
  const groups = groupByDate(activities, eventDates);
  const choose = (id: string, checked: boolean) => {
    if (!permiteVarias) {
      onChange(checked ? [id] : []);
      return;
    }
    onChange(checked ? [...selectedIds.filter((item) => item !== id), id] : selectedIds.filter((item) => item !== id));
  };

  return (
    <fieldset className="mb-4 space-y-3" disabled={disabled}>
      <legend className="text-sm font-semibold text-slate-800 mb-2">
        {permiteVarias ? t('activities.chooseSeveral') : t('activities.choose')}
      </legend>
      {groups.map((group) => (
        <div key={group.data} className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {formatDateBr(group.data)}
          </p>
          {group.items.map((item) => {
            const checked = selectedIds.includes(item.id);
            const blocked = item.lotada && !checked;
            return (
              <label
                key={item.id}
                className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                  blocked ? 'border-slate-100 text-slate-400' : 'border-slate-200 text-slate-800'
                }`}
              >
                <input
                  type={permiteVarias ? 'checkbox' : 'radio'}
                  name="atividade"
                  className="mt-1"
                  checked={checked}
                  disabled={blocked}
                  onChange={(event) => choose(item.id, event.target.checked)}
                />
                <span>
                  <span className="font-medium">{item.titulo}</span>
                  <span className="block text-xs text-slate-500">{activityMeta(t, item)}</span>
                </span>
              </label>
            );
          })}
        </div>
      ))}
      {!obrigatoria && (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type={permiteVarias ? 'checkbox' : 'radio'}
            name="atividade"
            checked={selectedIds.length === 0}
            onChange={() => onChange([])}
          />
          {t('activities.chooseNone')}
        </label>
      )}
    </fieldset>
  );
};

interface ActivityEnrollmentEditorProps {
  token: string;
  cursoId: string;
  onChanged?: () => void;
}

export const ActivityEnrollmentEditor: React.FC<ActivityEnrollmentEditorProps> = ({
  token,
  cursoId,
  onChanged,
}) => {
  const { t } = useT();
  const [data, setData] = useState<ParticipantActivitiesApi | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const response = await listAtividadesParticipante(token, cursoId);
      setData(response);
      setSelectedIds(response.atividades.filter((item) => item.selecionada).map((item) => item.id));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('activities.error'));
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, cursoId]);

  if (!data) {
    return error ? <p className="mt-3 text-xs text-rose-700">{error}</p> : null;
  }
  if (data.atividades.length === 0) return null;

  const choices: EventActivityChoice[] = data.atividades.map((item) => ({
    id: item.id,
    titulo: item.titulo,
    descricao: item.descricao,
    tipo: item.tipo,
    tipoPersonalizado: item.tipo_personalizado,
    data: item.data,
    horaInicio: item.hora_inicio,
    horaFim: item.hora_fim,
    cargaHoraria: item.carga_horaria,
    local: item.local,
    limiteParticipantes: item.limite_participantes,
    vagasDisponiveis: item.vagas_disponiveis,
    lotada: item.lotada,
    responsaveis: item.responsaveis.map((pessoa) => pessoa.nome).join(', '),
  }));
  const current = data.atividades.filter((item) => item.selecionada);

  const save = async (ids: string[]) => {
    const previous = selectedIds;
    setSelectedIds(ids);
    setSaving(true);
    setError(null);
    try {
      const response = await selecionarAtividadesParticipante(token, cursoId, ids);
      setData(response);
      setSelectedIds(response.atividades.filter((item) => item.selecionada).map((item) => item.id));
      onChanged?.();
    } catch (err) {
      setSelectedIds(previous);
      setError(err instanceof ApiError ? err.message : t('activities.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4">
      <p className="text-sm font-semibold text-slate-800">{t('activities.yourActivity')}</p>
      <p className="text-xs text-slate-500 mt-1">
        {current.length > 0 ? current.map((item) => item.titulo).join(', ') : t('activities.noneChosen')}
      </p>
      {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}
      {data.pode_alterar ? (
        <div className="mt-3">
          <ActivityPicker
            activities={choices}
            permiteVarias={data.permite_varias_atividades}
            obrigatoria={data.atividade_obrigatoria}
            selectedIds={selectedIds}
            disabled={saving}
            onChange={(ids) => void save(ids)}
          />
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-500">{t('activities.closed')}</p>
      )}
    </div>
  );
};
