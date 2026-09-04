import React from 'react';
import { NavTab, Institution, Certificate } from '../types';
import { DashboardResumo } from '../lib/dashboard';
import { labelCertificateStatus, useT } from '../i18n';
import { DonutChart } from './DonutChart';

interface DashboardViewProps {
  institutions: Institution[];
  certificates: Certificate[];
  resumo: DashboardResumo | null;
  resumoLoading?: boolean;
  resumoError?: string | null;
  isSuperAdmin?: boolean;
  onSelectTab: (tab: NavTab) => void;
  onOpenIssueModal: () => void;
}

function auditBadgeClass(status: Certificate['status']): string {
  if (status === 'Revoked') return 'bg-rose-50 text-rose-700 border border-rose-200';
  if (status === 'Expired') return 'bg-amber-50 text-amber-700 border border-amber-200';
  return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
}

function MetricCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint?: string;
  accent: string;
}) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={`text-3xl font-extrabold mt-1 tabular-nums ${accent}`}>{value}</p>
      {hint ? <p className="mt-2 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

const EMPTY_RESUMO: DashboardResumo = {
  eventos_total: 0,
  eventos_abertos: 0,
  eventos_cancelados: 0,
  eventos_rascunho: 0,
  eventos_concluidos: 0,
  certificados_emitidos: 0,
  certificados_validados: 0,
  certificados_revogados: 0,
  certificados_expirados: 0,
  acessos_certificados_total: 0,
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  institutions,
  certificates,
  resumo,
  resumoLoading = false,
  resumoError = null,
  isSuperAdmin = false,
  onSelectTab,
  onOpenIssueModal,
}) => {
  const { t } = useT();
  const stats = resumo ?? EMPTY_RESUMO;
  const activeInstCount = institutions.filter((i) => i.status === 'Active').length;
  const recent = certificates.slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          {t('dashboard.title')}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {t('dashboard.subtitle')}
          {isSuperAdmin ? ` ${t('dashboard.globalTotals')}` : ''}
        </p>
      </div>

      {resumoError && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {resumoError}
        </div>
      )}

      {resumoLoading && !resumo ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <span className="material-symbols-outlined animate-spin text-blue-600">
            progress_activity
          </span>
          {t('dashboard.loadingResumo')}
        </div>
      ) : (
        <>
          <div>
            <h2 className="text-sm font-bold text-slate-800 mb-3">{t('dashboard.eventsSection')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricCard
                label={t('dashboard.eventsTotal')}
                value={stats.eventos_total}
                hint={t('dashboard.eventsTotalHint')}
                accent="text-slate-900"
              />
              <MetricCard
                label={t('dashboard.eventsOpen')}
                value={stats.eventos_abertos}
                hint={t('dashboard.eventsOpenHint')}
                accent="text-blue-700"
              />
              <MetricCard
                label={t('dashboard.eventsCancelled')}
                value={stats.eventos_cancelados}
                hint={t('dashboard.eventsCancelledHint')}
                accent="text-rose-700"
              />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-800 mb-3">
              {t('dashboard.certificatesSection')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <MetricCard
                label={t('dashboard.certsIssued')}
                value={stats.certificados_emitidos}
                hint={t('dashboard.certsIssuedHint')}
                accent="text-slate-900"
              />
              <MetricCard
                label={t('dashboard.certsValidated')}
                value={stats.certificados_validados}
                hint={t('dashboard.certsValidatedHint')}
                accent="text-emerald-700"
              />
              <MetricCard
                label={t('dashboard.certsRevoked')}
                value={stats.certificados_revogados}
                hint={t('dashboard.certsRevokedHint')}
                accent="text-rose-700"
              />
              <MetricCard
                label={t('dashboard.certsAccesses')}
                value={stats.acessos_certificados_total}
                hint={t(
                  isSuperAdmin
                    ? 'dashboard.certsAccessesGlobalHint'
                    : 'dashboard.certsAccessesTenantHint',
                )}
                accent="text-blue-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 text-sm mb-4">
                {t('dashboard.eventsChart')}
              </h3>
              <DonutChart
                centerLabel={t('dashboard.total')}
                centerValue={stats.eventos_total}
                segments={[
                  {
                    value: stats.eventos_abertos,
                    color: '#2563eb',
                    label: t('dashboard.eventsOpen'),
                  },
                  {
                    value: stats.eventos_concluidos,
                    color: '#0f766e',
                    label: t('status.event.completed'),
                  },
                  {
                    value: stats.eventos_rascunho,
                    color: '#94a3b8',
                    label: t('status.event.draft'),
                  },
                  {
                    value: stats.eventos_cancelados,
                    color: '#e11d48',
                    label: t('dashboard.eventsCancelled'),
                  },
                ]}
              />
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 text-sm mb-4">
                {t('dashboard.certsChart')}
              </h3>
              <DonutChart
                centerLabel={t('dashboard.total')}
                centerValue={stats.certificados_emitidos}
                segments={[
                  {
                    value: stats.certificados_validados,
                    color: '#059669',
                    label: t('status.certificate.active'),
                  },
                  {
                    value: stats.certificados_revogados,
                    color: '#e11d48',
                    label: t('status.certificate.revoked'),
                  },
                  {
                    value: stats.certificados_expirados,
                    color: '#d97706',
                    label: t('status.certificate.expired'),
                  },
                ]}
              />
            </div>
          </div>
        </>
      )}

      {isSuperAdmin && (
        <p className="text-xs text-slate-500">
          {t('dashboard.activeInstitutions')}: {activeInstCount} / {institutions.length}{' '}
          {t('dashboard.verifiedPartners')}
        </p>
      )}

      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">{t('dashboard.coreWorkflows')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined">edit_calendar</span>
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-2">
                {t('dashboard.createEventTitle')}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                {t('dashboard.createEventDesc')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('create-event')}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
            >
              {t('dashboard.launchBuilder')}
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined">domain_add</span>
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-2">
                {t('dashboard.registerInstTitle')}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                {t('dashboard.registerInstDesc')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('register-institution')}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
            >
              {t('dashboard.registerInstitution')}
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined">workspace_premium</span>
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-2">
                {t('dashboard.issueCertTitle')}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                {t('dashboard.issueCertDesc')}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenIssueModal}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
            >
              {t('dashboard.issueCertificate')}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-bold text-slate-800 text-base mb-4">{t('dashboard.recentAudit')}</h3>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500">{t('dashboard.auditEmpty')}</p>
        ) : (
          <div className="space-y-3 text-xs">
            {recent.map((c) => (
              <div
                key={c.id}
                className="p-3.5 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center gap-3"
              >
                <div className="min-w-0">
                  <p className="font-bold text-slate-800">
                    {c.studentName} ({c.certificateNumber})
                  </p>
                  <p className="text-slate-500 text-[11px] mt-0.5 truncate">
                    {c.eventName} • {c.institutionName}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-[10px] text-slate-400 block mb-1">
                    {(c.sha256 || c.codigoValidacao).substring(0, 16)}...
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${auditBadgeClass(c.status)}`}
                  >
                    {labelCertificateStatus(t, c.status).toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
