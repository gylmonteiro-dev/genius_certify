import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EventItem, RegistrationFormData } from '../types';
import { ApiError } from '../lib/api';
import {
  getCursoPublico,
  inscreverCursoPublico,
  mapCursoPublicToUi,
} from '../lib/cursos';
import { EventRegistrationView } from './EventRegistrationView';
import { PublicLayout } from './PublicLayout';

export const PublicEventRegisterPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const item = await getCursoPublico(id);
        if (!cancelled) setEvent(mapCursoPublicToUi(item));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Event not found.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleRegister = async (evt: EventItem, form: RegistrationFormData) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await inscreverCursoPublico(evt.id, {
        nome: form.fullName,
        email: form.email,
        documento: form.documentId,
      });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Unable to complete registration.';
      setSubmitError(message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      {loading && (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500">
          <span className="material-symbols-outlined animate-spin text-blue-600">
            progress_activity
          </span>
          Loading event...
        </div>
      )}
      {error && (
        <div className="max-w-xl mx-auto p-8">
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        </div>
      )}
      {event && (
        <EventRegistrationView
          event={event}
          onSuccessRegister={handleRegister}
          onBack={() => navigate('/eventos')}
          isSubmitting={submitting}
          errorMessage={submitError}
        />
      )}
    </PublicLayout>
  );
};
