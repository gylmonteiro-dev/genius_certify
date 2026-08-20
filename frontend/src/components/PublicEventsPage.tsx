import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventItem } from '../types';
import { ApiError } from '../lib/api';
import { listCursosPublicos, mapCursoPublicToUi } from '../lib/cursos';
import { EventsCatalogView } from './EventsCatalogView';
import { PublicLayout } from './PublicLayout';
import { useT } from '../i18n';

export const PublicEventsPage: React.FC = () => {
  const { t } = useT();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const items = await listCursosPublicos();
        if (!cancelled) setEvents(items.map(mapCursoPublicToUi));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : t('public.loadEventsError'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PublicLayout>
      {error && (
        <div className="max-w-7xl mx-auto px-6 pt-6">
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500">
          <span className="material-symbols-outlined animate-spin text-blue-600">
            progress_activity
          </span>
          {t('public.loadingEvents')}
        </div>
      ) : (
        <EventsCatalogView
          events={events}
          onSelectRegister={(event) => navigate(`/eventos/${event.id}`)}
        />
      )}
    </PublicLayout>
  );
};
