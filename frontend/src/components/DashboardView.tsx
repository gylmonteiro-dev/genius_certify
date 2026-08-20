import React from 'react';
import { NavTab, Institution, EventItem, Certificate } from '../types';
import { useT } from '../i18n';

interface DashboardViewProps {
  institutions: Institution[];
  events: EventItem[];
  certificates: Certificate[];
  onSelectTab: (tab: NavTab) => void;
  onOpenIssueModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  institutions,
  events,
  certificates,
  onSelectTab,
  onOpenIssueModal,
}) => {
  const { t } = useT();
  const activeInstCount = institutions.filter((i) => i.status === 'Active').length;
  const activeEventsCount = events.filter((e) => e.status === 'Upcoming').length;

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          {t('dashboard.title')}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {t('dashboard.certsIssued')}
          </p>
          <p className="text-3xl font-extrabold mt-1 text-slate-900">
            {certificates.length}
          </p>
          <div className="flex items-center gap-1 mt-2 text-emerald-600 font-bold text-xs">
            <span>▲ +18.4%</span>
            <span className="text-slate-400 font-normal">{t('dashboard.thisMonth')}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {t('dashboard.activeInstitutions')}
          </p>
          <p className="text-3xl font-extrabold mt-1 text-slate-900">
            {activeInstCount}
          </p>
          <div className="flex items-center gap-1 mt-2 text-blue-600 font-bold text-xs">
            <span>● {institutions.length} {t('dashboard.total')}</span>
            <span className="text-slate-400 font-normal">{t('dashboard.verifiedPartners')}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {t('dashboard.upcomingEvents')}
          </p>
          <p className="text-3xl font-extrabold mt-1 text-slate-900">
            {activeEventsCount}
          </p>
          <div className="flex items-center gap-1 mt-2 text-indigo-600 font-bold text-xs">
            <span>● {events.length} {t('dashboard.total')}</span>
            <span className="text-slate-400 font-normal">{t('dashboard.coursesInApi')}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {t('dashboard.ledgerIntegrity')}
          </p>
          <p className="text-3xl font-extrabold mt-1 text-slate-900">
            100%
          </p>
          <div className="flex items-center gap-1 mt-2 text-slate-600 font-bold text-xs">
            <span className="font-mono text-[10px] text-slate-500">{t('dashboard.sha256')}</span>
          </div>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">{t('dashboard.coreWorkflows')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined">edit_calendar</span>
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-2">{t('dashboard.createEventTitle')}</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                {t('dashboard.createEventDesc')}
              </p>
            </div>
            <button
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
              <h3 className="font-bold text-slate-800 text-lg mb-2">{t('dashboard.registerInstTitle')}</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                {t('dashboard.registerInstDesc')}
              </p>
            </div>
            <button
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
              <h3 className="font-bold text-slate-800 text-lg mb-2">{t('dashboard.issueCertTitle')}</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                {t('dashboard.issueCertDesc')}
              </p>
            </div>
            <button
              onClick={onOpenIssueModal}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
            >
              {t('dashboard.issueCertificate')}
            </button>
          </div>
        </div>
      </div>

      {/* Recent Ledger Audit Feed */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-bold text-slate-800 text-base mb-4">{t('dashboard.recentAudit')}</h3>
        <div className="space-y-3 text-xs">
          {certificates.slice(0, 4).map((c) => (
            <div key={c.id} className="p-3.5 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-800">{c.studentName} ({c.certificateNumber})</p>
                <p className="text-slate-500 text-[11px] mt-0.5">{c.eventName} • {c.institutionName}</p>
              </div>
              <div className="text-right">
                <span className="font-mono text-[10px] text-slate-400 block mb-1">
                  {(c.sha256 || c.codigoValidacao).substring(0, 16)}...
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">{t('dashboard.verifiedBadge')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
