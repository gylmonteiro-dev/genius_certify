import React, { useState } from 'react';
import { Institution } from '../types';

interface InstitutionsViewProps {
  institutions: Institution[];
  onAddInstitutionClick: () => void;
  onUpdateStatus: (id: string, newStatus: Institution['status']) => void;
  onDeleteInstitution: (id: string) => void;
}

export const InstitutionsView: React.FC<InstitutionsViewProps> = ({
  institutions,
  onAddInstitutionClick,
  onUpdateStatus,
  onDeleteInstitution,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedInst, setSelectedInst] = useState<Institution | null>(null);

  const filtered = institutions.filter((inst) => {
    const matchesSearch =
      inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.responsiblePerson.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === 'All' || inst.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Manage Institutions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            View and manage all registered educational institutions and partners.
          </p>
        </div>

        <button
          onClick={onAddInstitutionClick}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-md font-semibold text-sm transition-colors flex items-center gap-2 shadow-sm active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[18px]">add_business</span>
          Add Institution
        </button>
      </div>

      {/* Main Table Card Container */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Filter / Actions Top Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/80">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Filter Dropdown */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Pending Review">Pending Review</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>

            {/* Quick Search inside Table */}
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by name..."
              className="bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <span className="text-xs text-slate-500 font-medium">
            Showing 1-{filtered.length} of {institutions.length} institutions
          </span>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-xs font-bold tracking-wider text-slate-500 uppercase">
                <th className="py-3.5 px-5">INSTITUTION NAME</th>
                <th className="py-3.5 px-5">RESPONSIBLE PERSON</th>
                <th className="py-3.5 px-5 text-center">EVENTS</th>
                <th className="py-3.5 px-5">STATUS</th>
                <th className="py-3.5 px-5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filtered.map((inst) => {
                const isSuspended = inst.status === 'Suspended';
                return (
                  <tr
                    key={inst.id}
                    className={`border-b border-slate-100 hover:bg-slate-50/80 transition-colors group ${
                      isSuspended ? 'bg-slate-50/50' : 'bg-white'
                    }`}
                  >
                    {/* Institution Name & Code */}
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

                    {/* Responsible Person */}
                    <td className="py-4 px-5 text-slate-700 font-medium">
                      {inst.responsiblePerson}
                    </td>

                    {/* Events Count */}
                    <td className="py-4 px-5 text-center text-slate-500 font-medium">
                      {inst.eventsCount}
                    </td>

                    {/* Status Pill */}
                    <td className="py-4 px-5">
                      {inst.status === 'Active' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      )}
                      {inst.status === 'Pending Review' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Pending Review
                        </span>
                      )}
                      {inst.status === 'Suspended' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Suspended
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedInst(inst)}
                          title="View Details"
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>

                        <div className="relative group/menu inline-block">
                          <button
                            title="More Actions"
                            className="p-1.5 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">more_vert</span>
                          </button>
                          {/* Hover popover actions */}
                          <div className="hidden group-hover/menu:block absolute right-0 bottom-full mb-1 w-36 bg-white border border-slate-200 shadow-xl rounded-lg p-1 z-20 text-xs text-left">
                            {inst.status !== 'Active' && (
                              <button
                                onClick={() => onUpdateStatus(inst.id, 'Active')}
                                className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 text-emerald-700 font-medium rounded-md transition-colors"
                              >
                                Set Active
                              </button>
                            )}
                            {inst.status !== 'Suspended' && (
                              <button
                                onClick={() => onUpdateStatus(inst.id, 'Suspended')}
                                className="w-full text-left px-2.5 py-1.5 hover:bg-rose-50 text-rose-700 font-medium rounded-md transition-colors"
                              >
                                Suspend
                              </button>
                            )}
                            <button
                              onClick={() => onDeleteInstitution(inst.id)}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 text-slate-700 rounded-md transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-white text-xs">
          <span className="text-slate-400 hidden sm:inline">Page 1 of 6</span>
          <div className="flex items-center gap-1 mx-auto sm:mx-0">
            <button
              disabled
              className="p-1.5 rounded text-slate-300 hover:bg-slate-100 disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <span className="w-7 h-7 flex items-center justify-center font-bold text-white bg-blue-600 rounded-md">
              1
            </span>
            <span className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer transition-colors">
              2
            </span>
            <span className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer transition-colors">
              3
            </span>
            <span className="text-slate-400">...</span>
            <span className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer transition-colors">
              6
            </span>
            <button className="p-1.5 rounded text-slate-600 hover:bg-slate-100 transition-colors">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Edit Details Drawer/Modal */}
      {selectedInst && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl border border-gray-200 relative">
            <button
              onClick={() => setSelectedInst(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="text-lg font-bold text-[#0b1c30] mb-4">
              Institution Details: {selectedInst.name}
            </h3>

            <div className="space-y-3 text-xs text-gray-700 mb-6">
              <p><strong>Code ID:</strong> {selectedInst.code}</p>
              <p><strong>CNPJ / Tax ID:</strong> {selectedInst.cnpjTaxId}</p>
              <p><strong>Address:</strong> {selectedInst.address}</p>
              <p><strong>Responsible User:</strong> {selectedInst.responsiblePerson}</p>
              <p><strong>Contact Email:</strong> {selectedInst.email}</p>
              <p><strong>Phone:</strong> {selectedInst.phone}</p>
              <p><strong>Events Hosted:</strong> {selectedInst.eventsCount}</p>
              <p><strong>Current Status:</strong> <span className="font-bold">{selectedInst.status}</span></p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedInst(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
