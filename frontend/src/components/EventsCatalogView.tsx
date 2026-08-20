import React, { useState } from 'react';
import { EventItem } from '../types';
import { labelEventModality, labelEventType, useT } from '../i18n';

interface EventsCatalogViewProps {
  events: EventItem[];
  onSelectRegister: (event: EventItem) => void;
}

export const EventsCatalogView: React.FC<EventsCatalogViewProps> = ({
  events,
  onSelectRegister,
}) => {
  const { t } = useT();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: t('catalog.filterAll') },
    { id: 'Technology', label: t('eventMeta.category.technology') },
    { id: 'Business', label: t('eventMeta.category.business') },
    { id: 'Design', label: t('eventMeta.category.design') },
    { id: 'upcoming', label: t('catalog.filterUpcoming') },
  ];

  const filteredEvents = events.filter((evt) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'upcoming') return evt.status === 'Upcoming';
    return evt.category === selectedCategory;
  });

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          {t('catalog.title')}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {t('catalog.subtitle')}
        </p>
      </div>

      {/* Category Pills Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-wider shrink-0 transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Bento Grid */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-16 text-center text-sm text-slate-500">
          {t('catalog.empty')}
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((evt) => {
          // Default banner images if missing
          const defaultBanner =
            'https://lh3.googleusercontent.com/aida-public/AB6AXuDHWNgAzdsDqjQxubvrpMFCHtJHUyl2441P5HrQIvlRqRObtSFi6cR45owJRXPBhKChYXReX3KSHk98estRq0Ma2oGKXDBRPenXesMktAgi3GIDy2093X2cFoeYbeE8A8xnL6Bsg0FnTOZxiW-E4JgnLp3ESiZ1QgIOmtzvFOTwXovUvwNHbhfy80h1VUNgKc2gwwXsQOk0ys_LEzzw_TXBcU3Sn1AL4ASjxP4OSrhQx9rDHa-AFsVdzw';

          return (
            <div
              key={evt.id}
              className="bg-white rounded-xl border border-slate-200 hover:shadow-md transition-all overflow-hidden flex flex-col group"
            >
              {/* Image Banner Header */}
              <div
                className="h-32 bg-slate-100 relative overflow-hidden bg-cover bg-center"
                style={{
                  backgroundImage: `url('${evt.bannerImage || defaultBanner}')`,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />

                {/* Badge top right */}
                <div className="absolute top-3 right-3 px-2.5 py-0.5 bg-blue-600 text-white rounded-md font-bold text-[10px] uppercase tracking-wider shadow-xs">
                  {labelEventType(t, evt.type)}
                </div>
              </div>

              {/* Body */}
              <div className="p-5 flex flex-col flex-1">
                <div className="text-slate-400 font-mono text-xs mb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">
                    calendar_today
                  </span>
                  {evt.date}
                </div>

                <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                  {evt.title}
                </h3>

                <p className="text-sm text-slate-500 mb-4 flex-1">
                  {evt.institutionName}
                </p>

                {/* Bottom Bar */}
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                  {evt.spotsLeft ? (
                    <span className="text-xs font-semibold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                      {t('catalog.spotsLeft', { count: evt.spotsLeft })}
                    </span>
                  ) : evt.closingSoon ? (
                    <span className="text-xs font-semibold px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full">
                      {t('catalog.closingSoon')}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                      {labelEventModality(t, evt.modality)}
                    </span>
                  )}

                  <button
                    onClick={() => onSelectRegister(evt)}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold text-xs transition-colors shadow-xs"
                  >
                    {t('catalog.register')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};
