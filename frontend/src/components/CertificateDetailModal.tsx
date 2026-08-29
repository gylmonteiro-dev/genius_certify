import React, { useEffect, useState } from 'react';
import { Certificate } from '../types';
import { labelCertificateStatus, useT } from '../i18n';
import {
  fetchCertificadoHtml,
  fetchCertificadoPublicoHtml,
} from '../lib/certificados';
import { CertificateHtmlViewer } from './CertificateHtmlViewer';

interface CertificateDetailModalProps {
  certificate: Certificate | null;
  authToken?: string | null;
  onClose: () => void;
  onDownloadPdf?: (cert: Certificate) => void;
}

export const CertificateDetailModal: React.FC<CertificateDetailModalProps> = ({
  certificate,
  authToken,
  onClose,
  onDownloadPdf,
}) => {
  const { t } = useT();
  const [html, setHtml] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  const isIssuedRecord = Boolean(certificate?.participanteId && authToken);

  useEffect(() => {
    if (!certificate) {
      setHtml('');
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setLoadError(null);
    setHtml('');

    const load = isIssuedRecord && authToken
      ? fetchCertificadoHtml(authToken, certificate.id)
      : fetchCertificadoPublicoHtml(certificate.codigoValidacao);

    void load
      .then((value) => {
        if (!cancelled) setHtml(value);
      })
      .catch(() => {
        if (!cancelled) {
          setHtml('');
          setLoadError(t('createEvent.previewError'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authToken, certificate, isIssuedRecord, t]);

  if (!certificate) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors print:hidden"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="pr-8 mb-4">
          <p className="text-xs font-mono text-slate-400">
            Ref: {certificate.certificateNumber}
          </p>
        </div>

        {loadError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-8 text-center text-sm text-rose-700">
            {loadError}
          </div>
        ) : html ? (
          <CertificateHtmlViewer
            title={t('public.viewCertificate')}
            html={html}
            layout="scroll"
          />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-16 text-center text-sm text-slate-500">
            {t('common.loading')}
          </div>
        )}

        <div className="flex justify-between items-center mt-6 print:hidden">
          <span className="text-xs text-slate-500">
            {t('certDetail.status')}:{' '}
            <strong className="text-emerald-700">
              {labelCertificateStatus(t, certificate.status)}
            </strong>
          </span>

          <div className="flex gap-2">
            {onDownloadPdf && (
              <button
                onClick={() => onDownloadPdf(certificate)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                {t('certDetail.downloadPdf')}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
