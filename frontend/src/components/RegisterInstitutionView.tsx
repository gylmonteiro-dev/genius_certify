import React, { useState } from 'react';
import { Institution } from '../types';

interface RegisterInstitutionViewProps {
  onRegister: (institution: Institution) => void;
  onCancel: () => void;
}

export const RegisterInstitutionView: React.FC<RegisterInstitutionViewProps> = ({
  onRegister,
  onCancel,
}) => {
  const [instName, setInstName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [address, setAddress] = useState('');

  const [respName, setRespName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instName || !respName || !email) {
      alert('Please fill in the required fields: Institution Name, Full Name, and Email.');
      return;
    }

    const codeNum = Math.floor(100 + Math.random() * 900);
    const newInst: Institution = {
      id: `inst-${Date.now()}`,
      name: instName,
      code: `INST-2024-${codeNum}`,
      cnpjTaxId: cnpj || '00.000.000/0000-00',
      address: address || 'Main Campus Address',
      responsiblePerson: respName,
      email: email,
      phone: phone || '+1 (555) 000-0000',
      eventsCount: 0,
      status: 'Active',
      logoLetter: instName.substring(0, 2).toUpperCase(),
      bgColor: 'bg-[#dae2fd] text-[#131b2e]',
    };

    onRegister(newInst);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          Register New Institution
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Add a new educational institution to the certification network.
        </p>
      </div>

      {/* Form Container Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-sm max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Institution Details */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
              <span className="material-symbols-outlined text-blue-600">
                account_balance
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                Institution Details
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label
                  htmlFor="inst_name"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                >
                  Institution Name
                </label>
                <input
                  id="inst_name"
                  type="text"
                  required
                  value={instName}
                  onChange={(e) => setInstName(e.target.value)}
                  placeholder="e.g., Global Tech University"
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="cnpj"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                >
                  CNPJ / Tax ID
                </label>
                <input
                  id="cnpj"
                  type="text"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="address"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                >
                  Full Address
                </label>
                <input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, Number, City, State, ZIP"
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Responsible User */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
              <span className="material-symbols-outlined text-blue-600">
                person
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                Responsible User
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label
                  htmlFor="resp_name"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                >
                  Full Name
                </label>
                <input
                  id="resp_name"
                  type="text"
                  required
                  value={respName}
                  onChange={(e) => setRespName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane.doe@institution.edu"
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                >
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 mt-8">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-md border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              Register Institution
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
