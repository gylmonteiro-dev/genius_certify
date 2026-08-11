import React, { useState } from 'react';
import { Student } from '../types';

interface StudentsViewProps {
  students: Student[];
}

export const StudentsView: React.FC<StudentsViewProps> = ({ students }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.documentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          Registered Students
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Student roster and verified credential records.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search student by name, email, or ID..."
            className="w-full sm:w-72 bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-xs font-bold tracking-wider text-slate-500 uppercase">
                <th className="py-3.5 px-5">STUDENT NAME</th>
                <th className="py-3.5 px-5">DOCUMENT / ID</th>
                <th className="py-3.5 px-5">INSTITUTION</th>
                <th className="py-3.5 px-5 text-center">CERTIFICATES</th>
                <th className="py-3.5 px-5">JOINED DATE</th>
                <th className="py-3.5 px-5">STATUS</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-5 font-semibold text-slate-900">
                    {s.name}
                    <span className="block text-xs font-normal text-slate-400">{s.email}</span>
                  </td>
                  <td className="py-4 px-5 font-mono text-xs text-slate-500">{s.documentId}</td>
                  <td className="py-4 px-5 text-slate-800 font-medium">{s.institution}</td>
                  <td className="py-4 px-5 text-center font-bold text-blue-600">
                    {s.certificatesCount}
                  </td>
                  <td className="py-4 px-5 text-slate-500 text-xs">{s.joinedDate}</td>
                  <td className="py-4 px-5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {s.status}
                    </span>
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
