import React, { useMemo, useState } from 'react';
import {
  CatalogoEventoCreatePayload,
  CatalogoEventoItem,
  CatalogoEventoKind,
  CatalogoEventoUpdatePayload,
} from '../lib/catalogoEventos';
import { useT } from '../i18n';

interface EventTypesViewProps {
  items: CatalogoEventoItem[];
  isLoading?: boolean;
  errorMessage?: string | null;
  isSubmitting?: boolean;
  onCreate: (payload: CatalogoEventoCreatePayload) => Promise<void>;
  onUpdate: (id: string, payload: CatalogoEventoUpdatePayload) => Promise<void>;
  onDeactivate: (id: string) => Promise<void>;
}

const KINDS: CatalogoEventoKind[] = ['categoria', 'modalidade', 'tipo'];

export const EventTypesView: React.FC<EventTypesViewProps> = ({
  items,
  isLoading = false,
  errorMessage = null,
  isSubmitting = false,
  onCreate,
  onUpdate,
  onDeactivate,
}) => {
  const { t } = useT();
  const [kind, setKind] = useState<CatalogoEventoKind>('categoria');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [nomeEn, setNomeEn] = useState('');
  const [slug, setSlug] = useState('');
  const [ordem, setOrdem] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = useMemo(
    () => items.filter((item) => item.kind === kind),
    [items, kind],
  );

  const resetForm = () => {
    setEditingId(null);
    setNome('');
    setNomeEn('');
    setSlug('');
    setOrdem('');
    setFormError(null);
  };

  const startEdit = (item: CatalogoEventoItem) => {
    setEditingId(item.id);
    setNome(item.nome);
    setNomeEn(item.nome_en);
    setSlug(item.slug);
    setOrdem(String(item.ordem));
    setFormError(null);
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (nome.trim().length < 2) {
      setFormError(t('eventTypes.nameRequired'));
      return;
    }
    const ordemValue = ordem.trim() ? Number(ordem) : undefined;
    try {
      if (editingId) {
        await onUpdate(editingId, {
          nome: nome.trim(),
          nome_en: nomeEn.trim(),
          ordem: Number.isFinite(ordemValue) ? ordemValue : undefined,
        });
      } else {
        await onCreate({
          kind,
          nome: nome.trim(),
          nome_en: nomeEn.trim(),
          slug: slug.trim() || undefined,
          ordem: Number.isFinite(ordemValue) ? ordemValue : undefined,
        });
      }
      resetForm();
    } catch {
      // parent shows toast/error
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          {t('eventTypes.title')}
        </h1>
        <p className="text-sm text-slate-500 mt-1">{t('eventTypes.subtitle')}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {KINDS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setKind(item);
              resetForm();
            }}
            className={`px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-wider shrink-0 transition-colors ${
              kind === item
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t(`eventTypes.kind.${item}`)}
          </button>
        ))}
      </div>

      {(errorMessage || formError) && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {formError || errorMessage}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800">
          {editingId ? t('eventTypes.editItem') : t('eventTypes.addItem')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={t('eventTypes.nome')}
            className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm"
          />
          <input
            value={nomeEn}
            onChange={(e) => setNomeEn(e.target.value)}
            placeholder={t('eventTypes.nomeEn')}
            className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm"
          />
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={t('eventTypes.slug')}
            disabled={Boolean(editingId)}
            className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm disabled:opacity-70"
          />
          <input
            type="number"
            value={ordem}
            onChange={(e) => setOrdem(e.target.value)}
            placeholder={t('eventTypes.ordem')}
            className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {editingId ? t('common.save') : t('eventTypes.create')}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-md border border-slate-200 text-sm text-slate-700"
            >
              {t('common.cancel')}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="px-5 py-12 text-sm text-slate-500">{t('eventTypes.loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-sm text-slate-500">{t('eventTypes.empty')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">{t('eventTypes.nome')}</th>
                <th className="px-5 py-3">{t('eventTypes.nomeEn')}</th>
                <th className="px-5 py-3">{t('eventTypes.slug')}</th>
                <th className="px-5 py-3">{t('eventTypes.ordem')}</th>
                <th className="px-5 py-3">{t('common.status')}</th>
                <th className="px-5 py-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-5 py-3 font-medium text-slate-800">{item.nome}</td>
                  <td className="px-5 py-3 text-slate-600">{item.nome_en || '—'}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{item.slug}</td>
                  <td className="px-5 py-3 text-slate-600">{item.ordem}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        item.ativo
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.ativo ? t('eventTypes.active') : t('eventTypes.inactive')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="text-blue-600 hover:underline text-xs font-semibold"
                    >
                      {t('eventTypes.edit')}
                    </button>
                    {item.ativo ? (
                      <button
                        type="button"
                        onClick={() => void onDeactivate(item.id)}
                        className="text-rose-600 hover:underline text-xs font-semibold"
                      >
                        {t('eventTypes.deactivate')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void onUpdate(item.id, { ativo: true })}
                        className="text-emerald-700 hover:underline text-xs font-semibold"
                      >
                        {t('eventTypes.activate')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
