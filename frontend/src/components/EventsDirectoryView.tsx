import React, { useState } from 'react';
import { EventItem } from '../types';

interface EventsDirectoryViewProps {
  events: EventItem[];
  onSelectEvent: (event: EventItem) => void;
  isPublicView?: boolean;
}

export const EventsDirectoryView: React.FC<EventsDirectoryViewProps> = ({
  events,
  onSelectEvent,
  isPublicView = false,
}) => {
  const [dateFilter, setDateFilter] = useState('All Dates');
  const [selectedModalities, setSelectedModalities] = useState<string[]>(['All']);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Technology']);
  const [activePartner, setActivePartner] = useState<string>('Global Institute');

  const handleModalityToggle = (mod: string) => {
    if (mod === 'All') {
      setSelectedModalities(['All']);
      return;
    }
    const filtered = selectedModalities.filter((m) => m !== 'All');
    if (filtered.includes(mod)) {
      const next = filtered.filter((m) => m !== mod);
      setSelectedModalities(next.length ? next : ['All']);
    } else {
      setSelectedModalities([...filtered, mod]);
    }
  };

  const handleCategoryToggle = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      const next = selectedCategories.filter((c) => c !== cat);
      setSelectedCategories(next.length ? next : ['Technology']);
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const filteredEvents = events.filter((evt) => {
    // Partner filter
    if (activePartner && activePartner !== 'All' && evt.institutionName !== activePartner) {
      // allow default if no specific match
    }

    // Category filter
    const catMatch = selectedCategories.includes(evt.category);
    return catMatch;
  });

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          Events Directory
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Browse and manage certification events across all partner institutions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar Filters */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
              Filters
            </h3>

            {/* Date Filter */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Date Range
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-800 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>All Dates</option>
                <option>This Week</option>
                <option>This Month</option>
                <option>Next 3 Months</option>
              </select>
            </div>

            {/* Modality Filter */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Modality
              </label>
              <div className="space-y-2">
                {['All', 'Online (Live)', 'In-Person'].map((mod) => (
                  <label key={mod} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={
                        mod === 'All'
                          ? selectedModalities.includes('All')
                          : selectedModalities.includes(mod)
                      }
                      onChange={() => handleModalityToggle(mod)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span>{mod}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Category
              </label>
              <div className="space-y-2">
                {['Technology', 'Business', 'Design', 'Data Science'].map((cat) => (
                  <label key={cat} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat)}
                      onChange={() => handleCategoryToggle(cat)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="lg:col-span-9 space-y-8">
          {/* Partner Institutions Carousel/Grid */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-slate-900">
                Partner Institutions
              </h3>
              <button
                onClick={() => setActivePartner('All')}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                View All
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { name: 'Tech University', icon: 'school' },
                { name: 'Global Institute', icon: 'account_balance', active: true },
                { name: 'Design Academy', icon: 'business' },
                { name: 'Science Lab', icon: 'biotech' },
              ].map((inst) => {
                const isSelected = activePartner === inst.name || (inst.active && activePartner === 'Global Institute');
                return (
                  <div
                    key={inst.name}
                    onClick={() => setActivePartner(inst.name)}
                    className={`rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden ${
                      isSelected
                        ? 'bg-white border-2 border-blue-600 shadow-sm'
                        : 'bg-white border border-slate-200 hover:border-blue-500 hover:shadow-xs'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-0 right-0 bg-blue-600 text-white px-2 py-0.5 rounded-bl font-bold text-[10px]">
                        Active
                      </div>
                    )}
                    <div className="w-12 h-12 rounded-full bg-slate-100 mb-2 flex items-center justify-center text-slate-700">
                      <span className="material-symbols-outlined text-[24px]">{inst.icon}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-800 text-center">
                      {inst.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Events List */}
          <section>
            <div className="flex justify-between items-end mb-4 border-b border-slate-200 pb-2">
              <h3 className="text-lg font-bold text-slate-900">
                Upcoming Events{' '}
                <span className="text-sm font-normal text-slate-400 ml-1">
                  ({filteredEvents.length} results)
                </span>
              </h3>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Sort by:</span>
                <select className="bg-transparent border-none font-semibold text-slate-800 focus:ring-0 cursor-pointer p-0 text-xs">
                  <option>Date (Closest)</option>
                  <option>Name (A-Z)</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {filteredEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row gap-4 hover:shadow-sm transition-all"
                >
                  {/* Large Date Block */}
                  <div className="md:w-40 shrink-0 flex flex-col items-center justify-center bg-slate-50 rounded-lg p-4 border border-slate-200 text-center">
                    <span className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">
                      {evt.dateMonth || 'OCTOBER'}
                    </span>
                    <span className="text-3xl font-bold text-slate-900 leading-none mb-1">
                      {evt.dateDay || '24'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {evt.time ? evt.time.split('-')[0] : '09:00 AM'}
                    </span>
                  </div>

                  {/* Body Info */}
                  <div className="flex-grow flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase border border-slate-200">
                          <span className="material-symbols-outlined text-[12px] mr-1">
                            {evt.modality === 'Online' ? 'videocam' : 'location_on'}
                          </span>
                          {evt.modality}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-[10px] uppercase border border-blue-200">
                          {evt.category}
                        </span>
                      </div>

                      <h4 className="text-lg font-bold text-slate-900 mb-1">
                        {evt.title}
                      </h4>
                      <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                        {evt.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                        <span className="material-symbols-outlined text-[18px]">domain</span>
                        <span>{evt.institutionName}</span>
                      </div>

                      <button
                        onClick={() => onSelectEvent(evt)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md font-semibold text-xs transition-colors shadow-xs"
                      >
                        {isPublicView ? 'Register' : 'Manage'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center items-center gap-2 mt-8">
              <button disabled className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 text-slate-300 disabled:opacity-40">
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-md bg-blue-600 text-white font-bold text-xs">
                1
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-medium transition-colors">
                2
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-medium transition-colors">
                3
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors">
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
