import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EventItem, RegistrationFormData } from '../types';
import { ApiError } from '../lib/api';
import {
  getCursoPublico,
  inscreverCursoPublico,
  mapCursoPublicToUi,
} from '../lib/cursos';
import {
  ContaParticipante,
  inscreverCursoAutenticado,
  listMinhasInscricoes,
} from '../lib/participanteAuth';
import { EventRegistrationView } from './EventRegistrationView';
import { PublicLayout } from './PublicLayout';
import { useT } from '../i18n';

interface PublicEventRegisterPageProps {
  conta?: ContaParticipante | null;
  token?: string | null;
}

export const PublicEventRegisterPage: React.FC<PublicEventRegisterPageProps> = ({
  conta = null,
  token = null,
}) => {
  const { t } = useT();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyEnrolled, setAlreadyEnrolled] = useState(false);

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
          setError(err instanceof ApiError ? err.message : t('public.eventNotFound'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  useEffect(() => {
    if (!id || !token) {
      setAlreadyEnrolled(false);
      return;
    }
    let cancelled = false;
    const loadEnrollment = async () => {
      try {
        const items = await listMinhasInscricoes(token);
        if (cancelled) return;
        const match = items.find(
          (item) => item.curso_id === id && !item.inscricao_cancelada,
        );
        setAlreadyEnrolled(Boolean(match));
      } catch {
        if (!cancelled) setAlreadyEnrolled(false);
      }
    };
    void loadEnrollment();
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  const handleRegister = async (evt: EventItem, form: RegistrationFormData) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await inscreverCursoPublico(evt.id, {
        nome: form.fullName,
        email: form.email,
        documento: form.documentId.replace(/\D/g, ''),
        data_nascimento: form.birthDate,
        ...(form.password ? { senha: form.password } : {}),
      });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t('public.registerFallbackError');
      setSubmitError(message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleAuthenticatedRegister = async () => {
    if (!event || !token) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await inscreverCursoAutenticado(token, event.id);
      setAlreadyEnrolled(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setAlreadyEnrolled(true);
        return;
      }
      const message =
        err instanceof ApiError ? err.message : t('public.registerFallbackError');
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
          {t('public.loadingEvent')}
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
          onAuthenticatedRegister={conta && token ? handleAuthenticatedRegister : undefined}
          onBack={() => navigate('/eventos')}
          isSubmitting={submitting}
          errorMessage={submitError}
          loggedInAccount={conta}
          alreadyEnrolled={alreadyEnrolled}
        />
      )}
    </PublicLayout>
  );
};
