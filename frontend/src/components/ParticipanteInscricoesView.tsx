import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../lib/api';
import {
  ContaParticipante,
  MinhaInscricao,
  cancelarMinhaInscricao,
  listMinhasInscricoes,
} from '../lib/participanteAuth';
import { formatDisplayDate, labelEventStatus, useT } from '../i18n';
import { PublicLayout } from './PublicLayout';
import { EventItem } from '../types';

interface ParticipanteInscricoesViewProps {
  conta: ContaParticipante;
  token: string;
  onLogout: () => void;
}

function mapCursoStatus(status: MinhaInscricao['curso_status']): EventItem['status'] {
  if (status === 'draft') return 'Draft';
  if (status === 'completed') return 'Completed';
  return 'Upcoming';
}

export const ParticipanteInscricoesView: React.FC<ParticipanteInscricoesViewProps> = ({
  conta,
  token,
  onLogout,
}) => {
  const { t, dateLocale } = useT();
  const [items, setItems] = useState<MinhaInscricao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listMinhasInscricoes(token);
      setItems(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('participant.loadError'));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleLeave = async (item: MinhaInscricao) => {
    if (!item.pode_cancelar) return;
    if (!window.confirm(t('participant.leaveConfirm'))) return;
    setLeavingId(item.id);
    setError(null);
    try {
      await cancelarMinhaInscricao(token, item.id);
      setItems((prev) => prev.filter((row) => row.id !== item.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('participant.loadError'));
    } finally {
      setLeavingId(null);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {t('participant.listTitle')}
            </h1>
            <p className="text-sm text-slate-500 mt-1">{t('participant.listHint')}</p>
            <p className="text-sm font-semibold text-slate-700 mt-2">
              {t('participant.hello', { name: conta.nome })}
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="self-start text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md border border-slate-200 bg-white"
          >
            {t('participant.logout')}
          </button>
        </div>

        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <span className="material-symbols-outlined animate-spin text-blue-600">
              progress_activity
            </span>
            {t('participant.loading')}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-sm text-slate-500 text-center">
            <p>{t('participant.empty')}</p>
            <Link
              to="/eventos"
              className="mt-4 inline-flex font-semibold text-blue-600 hover:underline"
            >
              {t('public.events')}
            </Link>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-xs font-bold tracking-wider text-slate-500 uppercase">
                    <th className="py-3 px-5">{t('certificates.colEvent')}</th>
                    <th className="py-3 px-5">{t('common.institution')}</th>
                    <th className="py-3 px-5">{t('common.date')}</th>
                    <th className="py-3 px-5">{t('common.status')}</th>
                    <th className="py-3 px-5">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-3 px-5 font-medium text-slate-900">
                        {item.curso_titulo}
                      </td>
                      <td className="py-3 px-5 text-slate-600">{item.instituicao_nome}</td>
                      <td className="py-3 px-5 text-slate-500 text-xs">
                        {item.data_evento
                          ? formatDisplayDate(item.data_evento, dateLocale, item.data_evento)
                          : '—'}
                      </td>
                      <td className="py-3 px-5 text-slate-600 text-xs">
                        {labelEventStatus(t, mapCursoStatus(item.curso_status))}
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex flex-wrap gap-2">
                          {item.pode_cancelar && (
                            <button
                              type="button"
                              disabled={leavingId === item.id}
                              onClick={() => void handleLeave(item)}
                              className="px-2.5 py-1 rounded-md border border-rose-200 bg-rose-50 text-rose-700 text-[11px] font-semibold hover:bg-rose-100 disabled:opacity-60"
                            >
                              {leavingId === item.id
                                ? t('participant.leaving')
                                : t('participant.leaveEvent')}
                            </button>
                          )}
                          {!item.pode_cancelar && item.ja_emitido && item.codigo_validacao && (
                            <Link
                              to={`/validar/${item.codigo_validacao}`}
                              className="px-2.5 py-1 rounded-md border border-blue-200 bg-blue-50 text-blue-700 text-[11px] font-semibold hover:bg-blue-100"
                            >
                              {t('participant.viewCertificate')}
                            </Link>
                          )}
                          {!item.pode_cancelar && item.curso_status === 'completed' && !item.ja_emitido && (
                            <span className="text-[11px] text-slate-400">
                              {t('participant.leaveBlockedCompleted')}
                            </span>
                          )}
                          {!item.pode_cancelar && item.ja_emitido && !item.codigo_validacao && (
                            <span className="text-[11px] text-slate-400">
                              {t('participant.leaveBlockedCertificate')}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
};
