import React, { useEffect, useState } from 'react';
import { ApiError } from '../lib/api';
import {
  ACTIVITY_STATUSES,
  ACTIVITY_TYPES,
  ActivityApi,
  ActivityStatus,
  ActivityType,
  ActivityWritePayload,
  cancelarAtividade,
  createAtividade,
  formatActivityHours,
  hoursFromSchedule,
  inativarAtividade,
  listAtividades,
  updateAtividade,
} from '../lib/atividades';
import { getCurso } from '../lib/cursos';
import { formatDateBr } from '../lib/dateBr';
import { useT } from '../i18n';

interface PersonOption {
  id: string;
  nome: string;
}

interface EventActivitiesSectionProps {
  token: string;
  cursoId: string | null;
  onActivitiesChange?: (items: ActivityApi[]) => void;
}

const emptyForm = {
  titulo: '',
  descricao: '',
  tipo: 'oficina' as ActivityType,
  tipoPersonalizado: '',
  data: '',
  horaInicio: '',
  horaFim: '',
  cargaHoraria: '',
  local: '',
  limite: '',
  status: 'ativa' as ActivityStatus,
  colaboradorIds: [] as string[],
};

export const EventActivitiesSection: React.FC<EventActivitiesSectionProps> = ({
  token,
  cursoId,
  onActivitiesChange,
}) => {
  const { t } = useT();
  const [items, setItems] = useState<ActivityApi[]>([]);
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [cargaManual, setCargaManual] = useState(false);
  const [saving, setSaving] = useState(false);

  const setHorario = (field: 'horaInicio' | 'horaFim', value: string) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (!cargaManual) {
        const hours = hoursFromSchedule(next.horaInicio, next.horaFim);
        if (hours != null) next.cargaHoraria = String(hours);
      }
      return next;
    });
  };

  const load = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const [curso, atividades] = await Promise.all([
        getCurso(token, id),
        listAtividades(token, id),
      ]);
      setPeople(
        (curso.colaboradores ?? [])
          .filter((item) => item.id)
          .map((item) => ({ id: item.id as string, nome: item.nome })),
      );
      setDates(curso.datas_evento ?? (curso.data_evento ? [curso.data_evento] : []));
      setItems(atividades);
      onActivitiesChange?.(atividades);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('activities.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!cursoId) return;
    void load(cursoId);
    // Recarrega quando o evento salvo muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursoId, token]);

  const openCreate = () => {
    setEditingId(null);
    setCargaManual(false);
    setForm({ ...emptyForm, data: dates[0] ?? '' });
    setFormOpen(true);
    setNotice(null);
  };

  const openEdit = (item: ActivityApi) => {
    const inicio = formatActivityHours(item.hora_inicio);
    const fim = formatActivityHours(item.hora_fim);
    const calculada = hoursFromSchedule(inicio, fim);
    setEditingId(item.id);
    setCargaManual(
      item.carga_horaria != null && calculada != null && item.carga_horaria !== calculada,
    );
    setForm({
      titulo: item.titulo,
      descricao: item.descricao,
      tipo: item.tipo,
      tipoPersonalizado: item.tipo_personalizado ?? '',
      data: item.data,
      horaInicio: inicio,
      horaFim: fim,
      cargaHoraria:
        item.carga_horaria != null
          ? String(item.carga_horaria)
          : calculada != null
            ? String(calculada)
            : '',
      local: item.local ?? '',
      limite: item.limite_participantes ? String(item.limite_participantes) : '',
      status: item.status,
      colaboradorIds: item.responsaveis.map((pessoa) => pessoa.colaborador_id),
    });
    setFormOpen(true);
    setNotice(null);
  };

  const payload = (): ActivityWritePayload => ({
    titulo: form.titulo.trim(),
    descricao: form.descricao.trim(),
    tipo: form.tipo,
    tipo_personalizado: form.tipo === 'outro' ? form.tipoPersonalizado.trim() : null,
    data: form.data,
    hora_inicio: form.horaInicio || null,
    hora_fim: form.horaFim || null,
    carga_horaria: form.cargaHoraria.trim() ? Number(form.cargaHoraria) : null,
    local: form.local.trim() || null,
    limite_participantes: form.limite.trim() ? Number(form.limite) : null,
    status: form.status,
    colaborador_ids: form.colaboradorIds,
  });

  const save = async () => {
    if (!cursoId) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateAtividade(token, cursoId, editingId, payload());
      } else {
        await createAtividade(token, cursoId, payload());
      }
      setFormOpen(false);
      setNotice(t('activities.saved'));
      await load(cursoId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('activities.error'));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (item: ActivityApi, action: 'inactivate' | 'cancel') => {
    if (!cursoId) return;
    setError(null);
    try {
      if (action === 'inactivate') await inativarAtividade(token, cursoId, item.id);
      else await cancelarAtividade(token, cursoId, item.id);
      await load(cursoId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('activities.error'));
    }
  };

  if (!cursoId) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-800">{t('activities.title')}</h3>
        <p className="mt-1 text-xs text-slate-500">{t('activities.saveFirst')}</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{t('activities.title')}</h3>
          <p className="mt-1 text-xs text-slate-500">{t('activities.hint')}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
        >
          {t('activities.add')}
        </button>
      </div>
      {loading && <p className="text-xs text-slate-500">{t('activities.loading')}</p>}
      {error && <p className="text-xs text-rose-700">{error}</p>}
      {notice && <p className="text-xs text-emerald-700">{notice}</p>}
      {!loading && items.length === 0 && (
        <p className="text-xs text-slate-500">{t('activities.empty')}</p>
      )}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-slate-900">{item.titulo}</p>
                <p className="text-[11px] text-slate-500">
                  {t(`activities.types.${item.tipo}`)} · {formatDateBr(item.data)}
                  {item.hora_inicio ? ` · ${formatActivityHours(item.hora_inicio)}` : ''}
                  {item.carga_horaria ? ` · ${item.carga_horaria}h` : ''}
                  {' · '}
                  {item.limite_participantes
                    ? t('activities.occupied', {
                        taken: item.vagas_ocupadas,
                        limit: item.limite_participantes,
                      })
                    : t('activities.unlimited')}
                  {item.lotada ? ` · ${t('activities.full')}` : ''}
                  {' · '}
                  {t(`activities.statuses.${item.status}`)}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="text-xs font-semibold text-blue-700" onClick={() => openEdit(item)}>
                  {t('activities.edit')}
                </button>
                {item.status === 'ativa' && (
                  <button type="button" className="text-xs font-semibold text-slate-600" onClick={() => void changeStatus(item, 'inactivate')}>
                    {t('activities.inactivate')}
                  </button>
                )}
                {item.status !== 'cancelada' && (
                  <button type="button" className="text-xs font-semibold text-rose-700" onClick={() => void changeStatus(item, 'cancel')}>
                    {t('activities.cancelActivity')}
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {formOpen && (
        <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
          <label className="text-xs text-slate-600 sm:col-span-2">
            {t('activities.name')}
            <input
              value={form.titulo}
              onChange={(event) => setForm({ ...form, titulo: event.target.value })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-slate-600 sm:col-span-2">
            {t('activities.description')}
            <textarea
              value={form.descricao}
              onChange={(event) => setForm({ ...form, descricao: event.target.value })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              rows={2}
            />
          </label>
          <label className="text-xs text-slate-600">
            {t('activities.type')}
            <select
              value={form.tipo}
              onChange={(event) => setForm({ ...form, tipo: event.target.value as ActivityType })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              {ACTIVITY_TYPES.map((tipo) => (
                <option key={tipo} value={tipo}>{t(`activities.types.${tipo}`)}</option>
              ))}
            </select>
          </label>
          {form.tipo === 'outro' && (
            <label className="text-xs text-slate-600">
              {t('activities.customType')}
              <input
                value={form.tipoPersonalizado}
                onChange={(event) => setForm({ ...form, tipoPersonalizado: event.target.value })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          )}
          <label className="text-xs text-slate-600">
            {t('activities.date')}
            <select
              value={form.data}
              onChange={(event) => setForm({ ...form, data: event.target.value })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              {dates.map((dia) => (
                <option key={dia} value={dia}>{formatDateBr(dia)}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-600">
            {t('activities.status')}
            <select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value as ActivityStatus })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              {ACTIVITY_STATUSES.map((status) => (
                <option key={status} value={status}>{t(`activities.statuses.${status}`)}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-600">
            {t('activities.start')}
            <input type="time" value={form.horaInicio} onChange={(event) => setHorario('horaInicio', event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="text-xs text-slate-600">
            {t('activities.end')}
            <input type="time" value={form.horaFim} onChange={(event) => setHorario('horaFim', event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="text-xs text-slate-600">
            {t('activities.workload')}
            <input
              type="number"
              min={1}
              value={form.cargaHoraria}
              onChange={(event) => {
                const value = event.target.value;
                setCargaManual(value.trim() !== '');
                setForm((current) => {
                  if (value.trim() !== '') return { ...current, cargaHoraria: value };
                  const hours = hoursFromSchedule(current.horaInicio, current.horaFim);
                  return { ...current, cargaHoraria: hours != null ? String(hours) : '' };
                });
              }}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-[11px] text-slate-500">{t('activities.workloadHint')}</span>
          </label>
          <label className="text-xs text-slate-600">
            {t('activities.limit')}
            <input type="number" min={1} value={form.limite} onChange={(event) => setForm({ ...form, limite: event.target.value })} placeholder={t('activities.unlimited')} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="text-xs text-slate-600 sm:col-span-2">
            {t('activities.location')}
            <input value={form.local} onChange={(event) => setForm({ ...form, local: event.target.value })} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <fieldset className="text-xs text-slate-600 sm:col-span-2">
            <legend className="mb-1">{t('activities.responsibles')}</legend>
            {people.length === 0 && <p className="text-slate-500">{t('activities.noResponsibles')}</p>}
            <div className="flex flex-wrap gap-2">
              {people.map((pessoa) => (
                <label key={pessoa.id} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1">
                  <input
                    type="checkbox"
                    checked={form.colaboradorIds.includes(pessoa.id)}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...form.colaboradorIds, pessoa.id]
                        : form.colaboradorIds.filter((id) => id !== pessoa.id);
                      setForm({ ...form, colaboradorIds: next });
                    }}
                  />
                  {pessoa.nome}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex gap-2 sm:col-span-2">
            <button type="button" disabled={saving || !form.titulo.trim() || !form.data} onClick={() => void save()} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
              {saving ? t('common.saving') : t('activities.save')}
            </button>
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">
              {t('activities.cancelEdit')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
