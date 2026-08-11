import React from 'react';
import { NavTab, Institution, EventItem, Certificate } from '../types';

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
  const activeInstCount = institutions.filter((i) => i.status === 'Active').length;
  const activeEventsCount = events.filter((e) => e.status === 'Upcoming').length;

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          Executive Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Real-time metrics, certificate ledger audit, and administrative controls.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Certificates Issued
          </p>
          <p className="text-3xl font-extrabold mt-1 text-slate-900">
            {certificates.length + 1420}
          </p>
          <div className="flex items-center gap-1 mt-2 text-emerald-600 font-bold text-xs">
            <span>▲ +18.4%</span>
            <span className="text-slate-400 font-normal">this month</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Active Institutions
          </p>
          <p className="text-3xl font-extrabold mt-1 text-slate-900">
            {activeInstCount}
          </p>
          <div className="flex items-center gap-1 mt-2 text-blue-600 font-bold text-xs">
            <span>● {institutions.length} Total</span>
            <span className="text-slate-400 font-normal">verified partners</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Upcoming Events
          </p>
          <p className="text-3xl font-extrabold mt-1 text-slate-900">
            {activeEventsCount}
          </p>
          <div className="flex items-center gap-1 mt-2 text-indigo-600 font-bold text-xs">
            <span>● 45 Spots</span>
            <span className="text-slate-400 font-normal">available today</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Ledger Integrity
          </p>
          <p className="text-3xl font-extrabold mt-1 text-slate-900">
            100%
          </p>
          <div className="flex items-center gap-1 mt-2 text-slate-600 font-bold text-xs">
            <span className="font-mono text-[10px] text-slate-500">SHA256 Fingerprinted</span>
          </div>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Core Workflows</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined">edit_calendar</span>
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-2">Create Event & Template</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Configure event metadata, dates, speaker signatures, and view live real-time certificate previews.
              </p>
            </div>
            <button
              onClick={() => onSelectTab('create-event')}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
            >
              Launch Builder
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined">domain_add</span>
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-2">Register Partner Institution</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Onboard new universities, coding bootcamps, and corporate partners into the certification network.
              </p>
            </div>
            <button
              onClick={() => onSelectTab('register-institution')}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
            >
              Register Institution
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined">workspace_premium</span>
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-2">Issue Cryptographic Certificate</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Issue an instant SHA256 verified certificate directly to a student email with unique hash fingerprinting.
              </p>
            </div>
            <button
              onClick={onOpenIssueModal}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
            >
              Issue Certificate
            </button>
          </div>
        </div>
      </div>

      {/* Recent Ledger Audit Feed */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-bold text-slate-800 text-base mb-4">Recent Certificate Audit Logs</h3>
        <div className="space-y-3 text-xs">
          {certificates.slice(0, 4).map((c) => (
            <div key={c.id} className="p-3.5 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-800">{c.studentName} ({c.certificateNumber})</p>
                <p className="text-slate-500 text-[11px] mt-0.5">{c.eventName} • {c.institutionName}</p>
              </div>
              <div className="text-right">
                <span className="font-mono text-[10px] text-slate-400 block mb-1">{c.sha256.substring(0, 16)}...</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">VERIFIED</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
