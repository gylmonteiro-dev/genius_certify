import React, { useState } from 'react';
import { Certificate } from '../types';

interface CertificatesViewProps {
  certificates: Certificate[];
  onOpenIssueModal: () => void;
  onViewCertificateDetail: (cert: Certificate) => void;
  onToggleStatus: (id: string) => void;
}

export const CertificatesView: React.FC<CertificatesViewProps> = ({
  certificates,
  onOpenIssueModal,
  onViewCertificateDetail,
  onToggleStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [shaInput, setShaInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<Certificate | 'NOT_FOUND' | null>(null);

  const filtered = certificates.filter((c) => {
    const matchesSearch =
      c.certificateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.sha256.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleVerifySha = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shaInput.trim()) return;
    const clean = shaInput.trim().toLowerCase();
    const match = certificates.find((c) => c.sha256.toLowerCase() === clean || c.certificateNumber.toLowerCase() === clean);
    if (match) {
      setVerifyResult(match);
    } else {
      setVerifyResult('NOT_FOUND');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Certificates Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Audit, verify, issue, and manage cryptographic credentials.
          </p>
        </div>

        <button
          onClick={onOpenIssueModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-md font-semibold text-sm transition-colors flex items-center gap-2 shadow-sm active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Issue Certificate
        </button>
      </div>

      {/* SHA256 Instant Verifier Banner */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-blue-400">verified_user</span>
          <h3 className="font-bold text-white text-sm">Cryptographic Verification Tool</h3>
        </div>
        <form onSubmit={handleVerifySha} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={shaInput}
            onChange={(e) => {
              setShaInput(e.target.value);
              setVerifyResult(null);
            }}
            placeholder="Paste SHA-256 fingerprint hash or Certificate Number to verify..."
            className="flex-1 bg-slate-800/80 border border-slate-700 rounded-md px-3.5 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-5 py-2 rounded-md shrink-0 transition-colors shadow-sm"
          >
            Verify Integrity
          </button>
        </form>

        {verifyResult && verifyResult !== 'NOT_FOUND' && (
          <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs flex items-center justify-between">
            <div>
              <p className="font-bold">✓ VALID CRYPTOGRAPHIC MATCH</p>
              <p className="text-emerald-200">Issued to {verifyResult.studentName} for {verifyResult.eventName} on {verifyResult.issueDate}. Status: {verifyResult.status}</p>
            </div>
            <button
              onClick={() => onViewCertificateDetail(verifyResult)}
              className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-md hover:bg-emerald-500 transition-colors"
            >
              View Certificate
            </button>
          </div>
        )}

        {verifyResult === 'NOT_FOUND' && (
          <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg text-xs font-bold">
            ✗ INVALID HASH: No matching cryptographic record found in the enterprise ledger.
          </div>
        )}
      </div>

      {/* Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/80">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search cert #, recipient, or event..."
              className="bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
              <option value="Revoked">Revoked</option>
            </select>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            Total Certificates: {filtered.length}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-xs font-bold tracking-wider text-slate-500 uppercase">
                <th className="py-3.5 px-5">CERTIFICATE #</th>
                <th className="py-3.5 px-5">RECIPIENT</th>
                <th className="py-3.5 px-5">EVENT</th>
                <th className="py-3.5 px-5">ISSUE DATE</th>
                <th className="py-3.5 px-5">SHA256 HASH</th>
                <th className="py-3.5 px-5">STATUS</th>
                <th className="py-3.5 px-5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filtered.map((cert) => (
                <tr
                  key={cert.id}
                  className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors"
                >
                  <td className="py-4 px-5 font-mono font-bold text-blue-600">
                    {cert.certificateNumber}
                  </td>
                  <td className="py-4 px-5 font-semibold text-slate-800">
                    {cert.studentName}
                    <span className="block text-xs font-normal text-slate-400">{cert.studentEmail}</span>
                  </td>
                  <td className="py-4 px-5 text-slate-800 max-w-xs truncate">
                    {cert.eventName}
                    <span className="block text-xs text-slate-400">{cert.institutionName}</span>
                  </td>
                  <td className="py-4 px-5 text-slate-600 font-medium text-xs">
                    {cert.issueDate}
                  </td>
                  <td className="py-4 px-5 font-mono text-[10px] text-slate-400 max-w-[120px] truncate" title={cert.sha256}>
                    {cert.sha256}
                  </td>
                  <td className="py-4 px-5">
                    {cert.status === 'Active' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    )}
                    {cert.status === 'Expired' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Expired
                      </span>
                    )}
                    {cert.status === 'Revoked' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        Revoked
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onViewCertificateDetail(cert)}
                        className="px-2.5 py-1 text-blue-600 hover:text-blue-700 text-xs font-semibold hover:bg-blue-50 rounded-md transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => onToggleStatus(cert.id)}
                        className="px-2.5 py-1 text-slate-500 hover:text-rose-600 text-xs font-medium hover:bg-slate-100 rounded-md transition-colors"
                        title="Toggle Revocation"
                      >
                        {cert.status === 'Active' ? 'Revoke' : 'Reactivate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
