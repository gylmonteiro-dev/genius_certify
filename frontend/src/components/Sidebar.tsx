import React from 'react';
import { NavTab } from '../types';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenIssueModal: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenIssueModal,
  isOpenMobile,
  onCloseMobile,
  onLogout,
}) => {
  const isEventsActive = 
    currentTab === 'events' || 
    currentTab === 'create-event' || 
    currentTab === 'events-catalog' || 
    currentTab === 'events-directory';

  const isInstitutionsActive = 
    currentTab === 'institutions' || 
    currentTab === 'register-institution';

  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: 'dashboard',
    },
    {
      id: 'institutions' as NavTab,
      label: 'Institutions',
      icon: 'corporate_fare',
      isActive: isInstitutionsActive,
    },
    {
      id: 'certificates' as NavTab,
      label: 'Certificates',
      icon: 'verified',
    },
    {
      id: 'events' as NavTab,
      label: 'Events',
      icon: 'event',
      isActive: isEventsActive,
    },
    {
      id: 'students' as NavTab,
      label: 'Students',
      icon: 'group',
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings',
      icon: 'settings',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed left-0 top-0 h-full w-[260px] bg-[#0f172a] text-slate-300 border-r border-slate-800 flex flex-col p-4 z-50 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="mb-6 px-2 mt-1">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-base shadow-sm">
              C
            </div>
            <div>
              <h2 className="font-semibold text-xl leading-tight text-white tracking-tight">
                CertifyPro
              </h2>
              <p className="text-xs text-slate-400">
                Enterprise Admin
              </p>
            </div>
          </div>

          {/* Issue Certificate Primary Action Button */}
          <button
            onClick={() => {
              onOpenIssueModal();
              onCloseMobile();
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              add
            </span>
            Issue Certificate
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-1">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const active = item.isActive !== undefined ? item.isActive : currentTab === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      onSelectTab(item.id);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-all ${
                      active
                        ? 'bg-slate-800 text-white font-medium shadow-sm'
                        : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-[20px]"
                      style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Quick Nav Sub-section: Event Views Direct Links */}
        <div className="py-3 border-t border-slate-800 px-1 my-2">
          <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase px-3 mb-2">
            Quick Views
          </p>
          <div className="space-y-1 text-xs">
            <button
              onClick={() => {
                onSelectTab('events');
                onCloseMobile();
              }}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2.5 ${
                currentTab === 'events' ? 'text-blue-400 font-semibold bg-slate-800/80' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Manage Events Table
            </button>

            <button
              onClick={() => {
                onSelectTab('create-event');
                onCloseMobile();
              }}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2.5 ${
                currentTab === 'create-event' ? 'text-blue-400 font-semibold bg-slate-800/80' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              Create Event & Preview
            </button>

            <button
              onClick={() => {
                onSelectTab('events-catalog');
                onCloseMobile();
              }}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2.5 ${
                currentTab === 'events-catalog' ? 'text-blue-400 font-semibold bg-slate-800/80' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Available Events Bento
            </button>

            <button
              onClick={() => {
                onSelectTab('events-directory');
                onCloseMobile();
              }}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2.5 ${
                currentTab === 'events-directory' ? 'text-blue-400 font-semibold bg-slate-800/80' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Events Directory
            </button>
          </div>
        </div>

        {/* Footer Items */}
        <div className="pt-3 border-t border-slate-800 px-1">
          <ul className="space-y-1">
            <li>
              <a
                href="#support"
                onClick={(e) => {
                  e.preventDefault();
                  alert('CertifyPro Enterprise Support: Contact support@certifypro.io or call +1 (800) 555-CERT');
                }}
                className="flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">help_outline</span>
                Support
              </a>
            </li>
            <li>
              <button
                onClick={() => {
                  onLogout();
                  onCloseMobile();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm text-rose-400 hover:bg-rose-950/40 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
                Sign Out
              </button>
            </li>
          </ul>
        </div>
      </aside>
    </>
  );
};
