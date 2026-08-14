import React, { useState } from 'react';
import { EventItem } from '../types';

interface EventsDirectoryViewProps {
  events: EventItem[];
  isLoading?: boolean;
  errorMessage?: string | null;
  onCreateEventClick?: () => void;
}

export const EventsDirectoryView: React.FC<EventsDirectoryViewProps> = ({
  events,
  isLoading = false,
  errorMessage = null,
  onCreateEventClick,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = events.filter((evt) => {
    const matchesSearch =
      evt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.instructor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.institutionName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || evt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Events Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Courses mapped from the certification API (`cursos`).
          </p>
        </div>
        {onCreateEventClick && (
          <button
            onClick={onCreateEventClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-md font-semibold text-sm transition-colors flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create Event
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/80">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Draft">Draft</option>
              <option value="Completed">Completed</option>
            </select>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by title, instructor..."
              className="bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Showing {filtered.length} of {events.length}
          </span>
        </div>

        {errorMessage && (
          <div className="m-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <span className="material-symbols-outlined animate-spin text-blue-600">
              progress_activity
            </span>
            Loading events...
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-slate-500">
            {events.length === 0
              ? 'No courses registered yet.'
              : 'No events match the current filters.'}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="divide-y divide-slate-100">
            {filtered.map((evt) => (
              <div key={evt.id} className="p-5 flex flex-col md:flex-row gap-4">
                <div className="md:w-36 shrink-0 flex flex-col items-center justify-center bg-slate-50 rounded-lg p-4 border border-slate-200 text-center">
                  <span className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">
                    {evt.dateMonth}
                  </span>
                  <span className="text-3xl font-bold text-slate-900 leading-none">
                    {evt.dateDay}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">{evt.status}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-bold text-slate-900 mb-1">{evt.title}</h4>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-3">{evt.description}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">domain</span>
                      {evt.institutionName}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">person</span>
                      {evt.instructor || '—'}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">schedule</span>
                      {evt.durationHours}h
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
