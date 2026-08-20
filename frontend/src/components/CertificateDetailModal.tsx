import React from 'react';
import { Certificate } from '../types';
import { labelCertificateStatus, useT } from '../i18n';

interface CertificateDetailModalProps {
  certificate: Certificate | null;
  onClose: () => void;
  onDownloadPdf?: (cert: Certificate) => void;
}

export const CertificateDetailModal: React.FC<CertificateDetailModalProps> = ({
  certificate,
  onClose,
  onDownloadPdf,
}) => {
  const { t } = useT();
  if (!certificate) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors print:hidden"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Certificate Display Card */}
        <div className="border-8 border-double border-slate-900 p-8 text-center bg-slate-50/50 relative overflow-hidden rounded-xl">
          {/* Top Seal Badge */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              workspace_premium
            </span>
          </div>

          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
            {t('certDetail.official')}
          </p>

          <p className="text-xs font-mono text-slate-400 mb-6">
            Ref: {certificate.certificateNumber}
          </p>

          <p className="text-xs text-slate-500 italic mb-2">{t('certDetail.certifyThat')}</p>

          <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
            {certificate.studentName}
          </h2>

          <p className="text-xs text-slate-500 mb-4">
            {t('certDetail.fulfilled')}
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg py-3 px-6 text-slate-900 font-bold text-lg inline-block max-w-md mx-auto mb-6 shadow-xs">
            {certificate.eventName}
          </div>

          <p className="text-xs text-slate-500 mb-6 max-w-md mx-auto">
            {t('certDetail.authorizedBy', { name: certificate.institutionName })}
          </p>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-6 text-left text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">{t('certDetail.issueDate')}</span>
              <span className="font-semibold text-slate-800">{certificate.issueDate}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">{t('certDetail.signature')}</span>
              <span className="font-semibold text-slate-800">{certificate.instructor}</span>
            </div>
          </div>

          {/* Cryptographic Hash Fingerprint */}
          <div className="mt-6 pt-3 border-t border-dashed border-slate-300 font-mono text-[9px] text-slate-400 break-all">
            {t('certDetail.validationUuid')}: {certificate.codigoValidacao}
            {certificate.sha256 ? ` · SHA256: ${certificate.sha256}` : ''}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-between items-center mt-6 print:hidden">
          <span className="text-xs text-slate-500">
            {t('certDetail.status')}: <strong className="text-emerald-700">{labelCertificateStatus(t, certificate.status)}</strong>
          </span>

          <div className="flex gap-2">
            {onDownloadPdf && certificate.alunoId && (
              <button
                onClick={() => onDownloadPdf(certificate)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                {t('certDetail.downloadPdf')}
              </button>
            )}
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              {t('common.print')}
            </button>
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
