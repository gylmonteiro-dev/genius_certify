import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Certificate } from '../types';
import { ApiError } from '../lib/api';
import {
  mapPublicCertificadoToUi,
  validarCertificadoPublico,
} from '../lib/certificados';
import { PublicLayout } from './PublicLayout';
import { useT } from '../i18n';

export const PublicValidateView: React.FC = () => {
  const { t } = useT();
  const { codigo } = useParams<{ codigo?: string }>();
  const navigate = useNavigate();
  const [codigoInput, setCodigoInput] = useState(codigo ?? '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<Certificate | 'NOT_FOUND' | 'INVALID' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const runVerify = async (value: string) => {
    setIsVerifying(true);
    setResult(null);
    setMessage(null);
    try {
      const data = await validarCertificadoPublico(value);
      setMessage(data.mensagem);
      if (data.valido) {
        setResult(mapPublicCertificadoToUi(data));
      } else if (data.numero_certificado) {
        setResult('INVALID');
      } else {
        setResult('NOT_FOUND');
      }
    } catch (err) {
      setResult('INVALID');
      setMessage(err instanceof ApiError ? err.message : t('public.invalidCode'));
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (codigo?.trim()) {
      setCodigoInput(codigo.trim());
      void runVerify(codigo.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = codigoInput.trim();
    if (!value) return;
    navigate(`/validar/${value}`);
  };

  return (
    <PublicLayout>
      <div className="max-w-xl mx-auto p-6 md:p-10 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {t('public.validateTitle')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('public.validateHint')}
          </p>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3"
        >
          <input
            type="text"
            value={codigoInput}
            onChange={(e) => setCodigoInput(e.target.value)}
            placeholder={t('public.validatePlaceholder')}
            className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isVerifying}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-md disabled:opacity-60"
          >
            {isVerifying ? t('public.verifying') : t('public.validate')}
          </button>
        </form>

        {result && result !== 'NOT_FOUND' && result !== 'INVALID' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-sm text-emerald-900 space-y-1">
            <p className="font-bold text-emerald-800">{t('public.validCertificate')}</p>
            <p>{result.studentName}</p>
            <p>{result.eventName}</p>
            <p className="text-emerald-700">{result.institutionName}</p>
            <p className="text-xs text-emerald-700/80">{result.certificateNumber}</p>
            {message && <p className="text-xs mt-2">{message}</p>}
          </div>
        )}

        {(result === 'NOT_FOUND' || result === 'INVALID') && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 text-sm text-rose-800 font-semibold">
            {message || t('public.notFound')}
          </div>
        )}
      </div>
    </PublicLayout>
  );
};
