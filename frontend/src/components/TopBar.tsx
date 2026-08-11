import React, { useState } from 'react';
import { NavTab } from '../types';

interface TopBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onToggleMobileSidebar: () => void;
  onSelectTab: (tab: NavTab) => void;
  titleOverride?: string;
  isPublicView?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  searchTerm,
  onSearchChange,
  onToggleMobileSidebar,
  onSelectTab,
  titleOverride,
  isPublicView = false,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAppsMenu, setShowAppsMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  return (
    <header className={`fixed top-0 right-0 h-16 bg-white border-b border-slate-200 flex justify-between items-center px-6 md:px-8 z-30 transition-all ${
      isPublicView ? 'w-full ml-0' : 'w-full md:w-[calc(100%-260px)] ml-0 md:ml-[260px]'
    }`}>
      {/* Left side: Title or Hamburger */}
      <div className="flex items-center gap-4">
        {!isPublicView && (
          <button
            onClick={onToggleMobileSidebar}
            className="p-1.5 rounded text-slate-600 md:hidden hover:bg-slate-100"
            aria-label="Toggle Navigation"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        )}

        <div className="flex flex-col">
          <h2 className="text-lg font-bold leading-none text-slate-800">
            {titleOverride || 'Enterprise Dashboard'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 hidden sm:block">
            CertifyPro System v2.4.0
          </p>
        </div>
      </div>

      {/* Center: Search input */}
      <div className="flex-1 max-w-md mx-4 md:mx-8">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search assets, events, certificates..."
            className="w-full bg-slate-100 border-none rounded-md py-2 pl-9 pr-8 text-sm text-slate-800 placeholder:text-slate-400 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowAppsMenu(false);
              setShowProfile(false);
            }}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer relative transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">notifications</span>
            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-4">
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                <span className="font-bold text-sm text-slate-800">Notifications</span>
                <span className="text-xs text-blue-600 cursor-pointer font-semibold hover:underline">Mark all read</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-blue-50/60 rounded-lg border-l-2 border-blue-600">
                  <p className="font-bold text-slate-800">New Certificate Verified</p>
                  <p className="text-slate-500">Dr. Sarah Jenkins verified CERT-2024-9981</p>
                  <span className="text-[10px] text-slate-400">10m ago</span>
                </div>
                <div className="p-2.5 hover:bg-slate-50 rounded-lg">
                  <p className="font-bold text-slate-800">Institution Review Pending</p>
                  <p className="text-slate-500">Global Arts Academy requested activation.</p>
                  <span className="text-[10px] text-slate-400">2h ago</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Apps Grid Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setShowAppsMenu(!showAppsMenu);
              setShowNotifications(false);
              setShowProfile(false);
            }}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">apps</span>
          </button>

          {showAppsMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-4">
              <span className="block font-bold text-[10px] text-slate-400 uppercase tracking-widest mb-3">
                CertifyPro Apps
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => {
                    onSelectTab('events');
                    setShowAppsMenu(false);
                  }}
                  className="p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 text-left flex flex-col gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-blue-600">event</span>
                  <span className="font-bold text-slate-800">Events Hub</span>
                </button>
                <button
                  onClick={() => {
                    onSelectTab('institutions');
                    setShowAppsMenu(false);
                  }}
                  className="p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 text-left flex flex-col gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-blue-600">corporate_fare</span>
                  <span className="font-bold text-slate-800">Institutions</span>
                </button>
                <button
                  onClick={() => {
                    onSelectTab('certificates');
                    setShowAppsMenu(false);
                  }}
                  className="p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 text-left flex flex-col gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-blue-600">verified</span>
                  <span className="font-bold text-slate-800">Certificates</span>
                </button>
                <button
                  onClick={() => {
                    onSelectTab('events-catalog');
                    setShowAppsMenu(false);
                  }}
                  className="p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 text-left flex flex-col gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-blue-600">grid_view</span>
                  <span className="font-bold text-slate-800">Public Catalog</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar */}
        <div className="relative ml-1">
          <button
            onClick={() => {
              setShowProfile(!showProfile);
              setShowNotifications(false);
              setShowAppsMenu(false);
            }}
            className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all flex items-center justify-center bg-slate-100 cursor-pointer"
          >
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0UUVIx8wSrUA-Ke5gkUBUCPM1sH_atDL_0vxtjNny28530pchyjVEXoGP6uP1VIBUm2Vi2WyHrxq5f2GYomH3r2A5yJ2sW3J_k4BA1fTJLYngGmChLEh76pCIfnmg9P0s9W7F6KjaRd1p2qq2GDxdZd9_mrcgZ9n1Ku__qEgRA1p8gRmMOsJftzsMbEpN1dd1zPi2eeve_xqH3sLEcsGAbRTVI11rEkh8p5q3gYPIaARQ1fLMH-0zHQ"
              alt="Administrator profile"
              className="w-full h-full object-cover"
            />
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 mb-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0UUVIx8wSrUA-Ke5gkUBUCPM1sH_atDL_0vxtjNny28530pchyjVEXoGP6uP1VIBUm2Vi2WyHrxq5f2GYomH3r2A5yJ2sW3J_k4BA1fTJLYngGmChLEh76pCIfnmg9P0s9W7F6KjaRd1p2qq2GDxdZd9_mrcgZ9n1Ku__qEgRA1p8gRmMOsJftzsMbEpN1dd1zPi2eeve_xqH3sLEcsGAbRTVI11rEkh8p5q3gYPIaARQ1fLMH-0zHQ"
                    alt="Administrator"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-800">Dr. Sarah Jenkins</p>
                  <p className="text-xs text-slate-400">gyldeveloper@gmail.com</p>
                  <span className="inline-block text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full mt-1">
                    System Admin
                  </span>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <button
                  onClick={() => {
                    onSelectTab('settings');
                    setShowProfile(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-slate-700 font-medium flex items-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
                  Account Settings
                </button>
                <button
                  onClick={() => {
                    onSelectTab('events-directory');
                    setShowProfile(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-slate-700 font-medium flex items-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                  View Public Directory
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
