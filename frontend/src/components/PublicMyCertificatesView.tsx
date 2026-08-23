import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../lib/api';
import {
  ConsultaCertificadoItemApi,
  ConsultaCertificadosApi,
  consultarMeusCertificados,
  downloadCertificadoPublicoPdf,
  publicCertificadoHtmlUrl,
} from '../lib/certificados';
import { CertificateHtmlViewer } from './CertificateHtmlViewer';
import { digitsOnly, formatCpf, isValidCpf } from '../lib/cpf';
import { formatDisplayDate, useT } from '../i18n';
import { PublicLayout } from './PublicLayout';

export const PublicMyCertificatesView: React.FC = () => {
  const { t, dateLocale } = useT();
  const [documento, setDocumento] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [isConsulting, setIsConsulting] = useState(false);
  const [result, setResult] = useState<ConsultaCertificadosApi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingCodigo, setDownloadingCodigo] = useState<string | null>(null);
  const [viewingItem, setViewingItem] = useState<ConsultaCertificadoItemApi | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDownloadError(null);
    setResult(null);
    if (!isValidCpf(documento) || !dataNascimento) {
      setError(t('public.consultNotFound'));
      return;
    }

    setIsConsulting(true);
    try {
      const data = await consultarMeusCertificados(
        digitsOnly(documento),
        dataNascimento,
      );
      setResult(data);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? t('public.consultNotFound')
          : err instanceof ApiError
            ? err.message
            : t('public.consultNotFound'),
      );
    } finally {
      setIsConsulting(false);
    }
  };

  const handleDownload = async (item: ConsultaCertificadoItemApi) => {
    setDownloadError(null);
    setDownloadingCodigo(item.codigo_validacao);
    try {
      await downloadCertificadoPublicoPdf(
        item.codigo_validacao,
        `${item.numero_certificado}.pdf`,
      );
    } catch (err) {
      setDownloadError(
        err instanceof ApiError ? err.message : t('errors.downloadPdf'),
      );
    } finally {
      setDownloadingCodigo(null);
    }
  };

  const resetSearch = () => {
    setResult(null);
    setError(null);
    setDownloadError(null);
    setViewingItem(null);
  };

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto p-6 md:p-10 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {t('public.myCertificatesTitle')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('public.myCertificatesHint')}
          </p>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="consultaCpf"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
              >
                {t('students.document')}
              </label>
              <input
                id="consultaCpf"
                type="text"
                value={documento}
                onChange={(e) => setDocumento(formatCpf(e.target.value))}
                placeholder={t('students.documentPlaceholder')}
                inputMode="numeric"
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label
                htmlFor="consultaNascimento"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
              >
                {t('common.birthDate')}
              </label>
              <input
                id="consultaNascimento"
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isConsulting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-md disabled:opacity-60"
          >
            {isConsulting ? t('public.consulting') : t('public.consult')}
          </button>
        </form>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 text-sm text-rose-800 font-semibold">
            {error}
          </div>
        )}

        {result && result.certificados.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-900">
            <p className="font-semibold">{t('public.consultResult', { name: result.nome })}</p>
            <p className="mt-1">{t('public.consultEmpty')}</p>
          </div>
        )}

        {result && result.certificados.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                {t('public.consultResult', { name: result.nome })}
              </h2>
              <button
                type="button"
                onClick={resetSearch}
                className="text-xs font-semibold text-blue-600 hover:underline self-start"
              >
                {t('public.newSearch')}
              </button>
            </div>
            {downloadError && (
              <div className="m-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {downloadError}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-xs font-bold tracking-wider text-slate-500 uppercase">
                    <th className="py-3 px-5">{t('certificates.colEvent')}</th>
                    <th className="py-3 px-5">{t('common.institution')}</th>
                    <th className="py-3 px-5">{t('certificates.colNumber')}</th>
                    <th className="py-3 px-5">{t('certificates.colIssueDate')}</th>
                    <th className="py-3 px-5">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {result.certificados.map((item) => (
                    <tr key={item.codigo_validacao} className="border-b border-slate-100">
                      <td className="py-3 px-5 font-medium text-slate-900">
                        {item.curso_titulo}
                      </td>
                      <td className="py-3 px-5 text-slate-600">{item.instituicao_nome}</td>
                      <td className="py-3 px-5 font-mono text-xs text-slate-500">
                        {item.numero_certificado}
                      </td>
                      <td className="py-3 px-5 text-slate-500 text-xs">
                        {formatDisplayDate(
                          item.emitido_em.slice(0, 10),
                          dateLocale,
                          item.emitido_em.slice(0, 10),
                        )}
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingItem(item)}
                            className="px-2.5 py-1 rounded-md border border-blue-200 bg-blue-50 text-blue-700 text-[11px] font-semibold hover:bg-blue-100"
                          >
                            {t('public.viewCertificate')}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDownload(item)}
                            disabled={downloadingCodigo === item.codigo_validacao}
                            className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 text-[11px] font-semibold hover:bg-slate-50 disabled:opacity-60"
                          >
                            {downloadingCodigo === item.codigo_validacao
                              ? t('common.loading')
                              : t('public.downloadPdf')}
                          </button>
                          <Link
                            to={`/validar/${item.codigo_validacao}`}
                            className="px-2.5 py-1 rounded-md border border-blue-200 bg-blue-50 text-blue-700 text-[11px] font-semibold hover:bg-blue-100"
                          >
                            {t('public.validateLink')}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {viewingItem && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl border border-slate-200 my-8">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {t('public.viewCertificate')}
                  </h2>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    {viewingItem.numero_certificado}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingItem(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <CertificateHtmlViewer
                title={t('public.viewCertificate')}
                src={publicCertificadoHtmlUrl(viewingItem.codigo_validacao)}
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => void handleDownload(viewingItem)}
                  disabled={downloadingCodigo === viewingItem.codigo_validacao}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold disabled:opacity-60"
                >
                  {t('public.downloadPdf')}
                </button>
                <button
                  type="button"
                  onClick={() => setViewingItem(null)}
                  className="px-4 py-2 border border-slate-200 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
};
