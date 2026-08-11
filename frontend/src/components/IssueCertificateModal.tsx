import React, { useState } from 'react';
import { Certificate, EventItem, Institution } from '../types';

interface IssueCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: EventItem[];
  institutions: Institution[];
  onIssueSuccess: (newCert: Certificate) => void;
}

export const IssueCertificateModal: React.FC<IssueCertificateModalProps> = ({
  isOpen,
  onClose,
  events,
  institutions,
  onIssueSuccess,
}) => {
  const [studentName, setStudentName] = useState('Jane Doe');
  const [studentEmail, setStudentEmail] = useState('jane.doe@company.com');
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || '');
  const [issueDate, setIssueDate] = useState('2024-10-25');

  if (!isOpen) return null;

  const handleIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !studentEmail) {
      alert('Please enter student name and email.');
      return;
    }

    const matchedEvt = events.find((e) => e.id === selectedEventId) || events[0];
    const certNum = `CERT-2024-${Math.floor(1000 + Math.random() * 9000)}`;

    // Generate pseudo SHA256 hex string
    const hexChars = '0123456789abcdef';
    let sha = '';
    for (let i = 0; i < 64; i++) {
      sha += hexChars[Math.floor(Math.random() * 16)];
    }

    const newCert: Certificate = {
      id: `cert-${Date.now()}`,
      certificateNumber: certNum,
      studentName,
      studentEmail,
      eventName: matchedEvt ? matchedEvt.title : 'Annual Tech Symposium 2024',
      eventId: matchedEvt ? matchedEvt.id : 'evt-1',
      institutionName: matchedEvt ? matchedEvt.institutionName : 'TechCorp Security Institute',
      issueDate: issueDate || '2024-10-25',
      durationHours: matchedEvt ? matchedEvt.durationHours : 8,
      instructor: matchedEvt ? matchedEvt.instructor : 'Dr. Sarah Jenkins',
      sha256: sha,
      status: 'Active',
    };

    onIssueSuccess(newCert);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-[20px]">workspace_premium</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Issue New Certificate</h2>
            <p className="text-xs text-slate-500">
              Generate a cryptographic SHA256 credential.
            </p>
          </div>
        </div>

        <form onSubmit={handleIssue} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              STUDENT FULL NAME
            </label>
            <input
              type="text"
              required
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              STUDENT EMAIL ADDRESS
            </label>
            <input
              type="email"
              required
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              placeholder="alex.rivera@example.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              SELECT EVENT / WORKSHOP
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title} ({evt.institutionName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              ISSUE DATE
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-200 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">verified</span>
              Generate & Mint Credential
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
