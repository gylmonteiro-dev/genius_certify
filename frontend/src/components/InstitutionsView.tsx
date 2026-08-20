import React, { useEffect, useState } from 'react';
import { Institution } from '../types';
import { labelInstitutionStatus, useT } from '../i18n';

interface InstitutionsViewProps {
  institutions: Institution[];
  isLoading?: boolean;
  errorMessage?: string | null;
  canManage?: boolean;
  onAddInstitutionClick: () => void;
  onUpdateStatus: (id: string, newStatus: Institution['status']) => void;
  onDeleteInstitution: (id: string) => void;
}

export const InstitutionsView: React.FC<InstitutionsViewProps> = ({
  institutions,
  isLoading = false,
  errorMessage = null,
  canManage = false,
  onAddInstitutionClick,
  onUpdateStatus,
  onDeleteInstitution,
}) => {
  const { t } = useT();
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedInstId, setSelectedInstId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filtered = institutions.filter((inst) => {
    const matchesSearch =
      inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.responsiblePerson.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === 'All' || inst.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const selectedInst =
    selectedInstId != null
      ? institutions.find((item) => item.id === selectedInstId) ?? null
      : null;

  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [openMenuId]);

  const handleStatus = (id: string, status: Institution['status']) => {
    onUpdateStatus(id, status);
    setOpenMenuId(null);
  };

  const statusActions = (inst: Institution) => (
    <>
      {inst.status !== 'Active' && (
        <button
          type="button"
          onClick={() => handleStatus(inst.id, 'Active')}
          className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 text-emerald-700 font-medium rounded-md transition-colors"
        >
          {t('institutions.setActive')}
        </button>
      )}
      {inst.status !== 'Suspended' && (
        <button
          type="button"
          onClick={() => handleStatus(inst.id, 'Suspended')}
          className="w-full text-left px-2.5 py-1.5 hover:bg-rose-50 text-rose-700 font-medium rounded-md transition-colors"
        >
          {t('institutions.suspend')}
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          onDeleteInstitution(inst.id);
          setOpenMenuId(null);
          setSelectedInstId(null);
        }}
        className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 text-slate-700 rounded-md transition-colors"
      >
        {t('institutions.remove')}
      </button>
    </>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            {t('institutions.title')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('institutions.subtitle')}
          </p>
        </div>

        {canManage && (
          <button
            onClick={onAddInstitutionClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-md font-semibold text-sm transition-colors flex items-center gap-2 shadow-sm active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">add_business</span>
            {t('institutions.add')}
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/80 rounded-t-xl">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">{t('common.allStatuses')}</option>
                <option value="Active">{t('status.institution.active')}</option>
                <option value="Pending Review">{t('status.institution.pendingReview')}</option>
                <option value="Suspended">{t('status.institution.suspended')}</option>
              </select>
            </div>

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('institutions.filterByName')}
              className="bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <span className="text-xs text-slate-500 font-medium">
            {t('institutions.showing', { filtered: filtered.length, total: institutions.length })}
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
            {t('institutions.loading')}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-slate-500">
            {institutions.length === 0
              ? t('institutions.empty')
              : t('institutions.noMatch')}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className={`overflow-x-auto ${openMenuId ? 'pb-28' : ''}`}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-xs font-bold tracking-wider text-slate-500 uppercase">
                  <th className="py-3.5 px-5">{t('institutions.colName')}</th>
                  <th className="py-3.5 px-5">{t('institutions.colResponsible')}</th>
                  <th className="py-3.5 px-5 text-center">{t('institutions.colEvents')}</th>
                  <th className="py-3.5 px-5">{t('institutions.colStatus')}</th>
                  <th className="py-3.5 px-5 text-right">{t('institutions.colActions')}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filtered.map((inst) => {
                  const isSuspended = inst.status === 'Suspended';
                  return (
                    <tr
                      key={inst.id}
                      className={`border-b border-slate-100 hover:bg-slate-50/80 transition-colors ${
                        isSuspended ? 'bg-slate-50/50' : 'bg-white'
                      }`}
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                              inst.bgColor || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {inst.logoLetter || inst.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div
                              className={`font-semibold text-slate-800 ${
                                isSuspended ? 'line-through opacity-60' : ''
                              }`}
                            >
                              {inst.name}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              ID: {inst.code}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-5 text-slate-700 font-medium">
                        {inst.responsiblePerson}
                      </td>

                      <td className="py-4 px-5 text-center text-slate-500 font-medium">
                        {inst.eventsCount}
                      </td>

                      <td className="py-4 px-5">
                        {inst.status === 'Active' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {labelInstitutionStatus(t, inst.status)}
                          </span>
                        )}
                        {inst.status === 'Pending Review' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {labelInstitutionStatus(t, inst.status)}
                          </span>
                        )}
                        {inst.status === 'Suspended' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            {labelInstitutionStatus(t, inst.status)}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedInstId(inst.id)}
                            title={t('institutions.viewDetails')}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>

                          {canManage && (
                            <div className="relative inline-block">
                              <button
                                type="button"
                                title={t('institutions.moreActions')}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId((current) =>
                                    current === inst.id ? null : inst.id,
                                  );
                                }}
                                className="p-1.5 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[18px]">more_vert</span>
                              </button>
                              {openMenuId === inst.id && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 shadow-xl rounded-lg p-1 z-30 text-xs text-left"
                                >
                                  {statusActions(inst)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t border-slate-200 bg-white text-xs text-slate-400 rounded-b-xl">
          {institutions.length === 1
            ? t('institutions.loadedFromApi', { count: institutions.length })
            : t('institutions.loadedFromApiPlural', { count: institutions.length })}
        </div>
      </div>

      {selectedInst && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl border border-gray-200 relative">
            <button
              type="button"
              onClick={() => setSelectedInstId(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="text-lg font-bold text-[#0b1c30] mb-4">
              {t('institutions.detailsTitle', { name: selectedInst.name })}
            </h3>

            <div className="space-y-3 text-xs text-gray-700 mb-6">
              <p><strong>{t('institutions.codeId')}:</strong> {selectedInst.code}</p>
              <p><strong>{t('institutions.cnpj')}:</strong> {selectedInst.cnpjTaxId}</p>
              <p><strong>{t('institutions.address')}:</strong> {selectedInst.address}</p>
              <p><strong>{t('institutions.responsibleUser')}:</strong> {selectedInst.responsiblePerson}</p>
              <p><strong>{t('institutions.contactEmail')}:</strong> {selectedInst.email}</p>
              <p><strong>{t('institutions.phone')}:</strong> {selectedInst.phone}</p>
              <p><strong>{t('institutions.eventsHosted')}:</strong> {selectedInst.eventsCount}</p>
              <p>
                <strong>{t('institutions.currentStatus')}:</strong>{' '}
                <span className="font-bold">{labelInstitutionStatus(t, selectedInst.status)}</span>
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {canManage && selectedInst.status !== 'Active' && (
                <button
                  type="button"
                  onClick={() => handleStatus(selectedInst.id, 'Active')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                >
                  {t('institutions.setActive')}
                </button>
              )}
              {canManage && selectedInst.status !== 'Suspended' && (
                <button
                  type="button"
                  onClick={() => handleStatus(selectedInst.id, 'Suspended')}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-xs font-semibold"
                >
                  {t('institutions.suspend')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedInstId(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-xs font-semibold"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
