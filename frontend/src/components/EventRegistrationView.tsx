import React, { useState } from 'react';
import { EventItem, RegistrationFormData } from '../types';

interface EventRegistrationViewProps {
  event: EventItem;
  onSuccessRegister: (event: EventItem, formData: RegistrationFormData) => void | Promise<void>;
  onBack: () => void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

export const EventRegistrationView: React.FC<EventRegistrationViewProps> = ({
  event,
  onSuccessRegister,
  onBack,
  isSubmitting = false,
  errorMessage = null,
}) => {
  const [fullName, setFullName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !workEmail || !documentId) {
      alert('Please complete all registration fields.');
      return;
    }

    try {
      await onSuccessRegister(event, {
        fullName,
        email: workEmail,
        documentId,
      });
      setIsSubmitted(true);
    } catch {
      // parent shows errorMessage
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4 sm:p-6 md:p-8 bg-slate-50">
      <div className="w-full max-w-5xl mx-auto">
        {/* Top Back Navigation */}
        <button
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to Events List
        </button>

        {!isSubmitted ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Left Column: Event Details */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between shadow-sm relative">
              <div>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold text-xs border border-blue-200 mb-4">
                  <span className="material-symbols-outlined text-[14px] mr-1 text-blue-600">
                    verified
                  </span>
                  Official Certification Event
                </span>

                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight mb-4">
                  {event.title}
                </h1>

                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                  {event.description}
                </p>

                <div className="space-y-4">
                  <div className="flex items-start">
                    <span className="material-symbols-outlined text-blue-600 mr-3 mt-0.5">
                      calendar_today
                    </span>
                    <div>
                      <p className="font-semibold text-base text-slate-900">
                        {event.date}
                      </p>
                      <p className="text-slate-500 text-xs">{event.time}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <span className="material-symbols-outlined text-blue-600 mr-3 mt-0.5">
                      person
                    </span>
                    <div>
                      <p className="font-semibold text-base text-slate-900">
                        {event.instructor}
                      </p>
                      <p className="text-slate-500 text-xs">
                        {event.instructorRole || 'Lead Instructor'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hosted By Footer */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-900 text-white rounded-lg font-bold flex items-center justify-center text-lg shrink-0">
                    {event.institutionName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      HOSTED BY
                    </p>
                    <p className="font-semibold text-base text-slate-900">
                      {event.institutionName}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Registration Form */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between shadow-sm">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-6">
                  Secure Your Spot
                </h2>

                {errorMessage && (
                  <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {errorMessage}
                  </div>
                )}
                <form id="regForm" onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
                  <div>
                    <label
                      htmlFor="fullName"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                    >
                      Full Name
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="w-full h-11 px-4 border border-slate-200 rounded-md bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="workEmail"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                    >
                      Work Email
                    </label>
                    <input
                      id="workEmail"
                      type="email"
                      required
                      value={workEmail}
                      onChange={(e) => setWorkEmail(e.target.value)}
                      placeholder="jane@company.com"
                      className="w-full h-11 px-4 border border-slate-200 rounded-md bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="documentId"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
                    >
                      Professional ID / Document Number
                    </label>
                    <input
                      id="documentId"
                      type="text"
                      required
                      value={documentId}
                      onChange={(e) => setDocumentId(e.target.value)}
                      placeholder="ID-XXXX-YYYY"
                      className="w-full h-11 px-4 border border-slate-200 rounded-md bg-slate-50 text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Required for certificate issuance.
                    </p>
                  </div>
                </form>
              </div>

              <div className="mt-8 pt-4">
                <button
                  type="submit"
                  form="regForm"
                  disabled={isSubmitting}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-md transition-colors shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60"
                >
                  {isSubmitting ? 'Registering...' : 'Register Now'}
                  <span className="material-symbols-outlined text-[18px]">
                    arrow_forward
                  </span>
                </button>

                <p className="text-center text-[11px] text-slate-400 mt-3">
                  By registering, you agree to our Terms of Service and Privacy Policy.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Confirmation State */
          <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-lg mx-auto text-center shadow-lg">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
              <span className="material-symbols-outlined text-[36px]">check_circle</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Registration Confirmed!</h2>
            <p className="text-sm text-slate-500 mb-6">
              Thank you, <strong className="text-slate-900">{fullName}</strong>. Your spot for{' '}
              <strong className="text-blue-600">{event.title}</strong> has been secured.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-left space-y-2 mb-6 font-mono">
              <p><span className="text-slate-400">TICKET REF:</span> TKT-2024-8849</p>
              <p><span className="text-gray-400">EMAIL:</span> {workEmail}</p>
              <p><span className="text-gray-400">ID RECORD:</span> {documentId}</p>
              <p className="truncate"><span className="text-slate-400">SHA256 KEY:</span> e3b0c44298fc1c149afbf4c8996fb92427ae41e4</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onBack}
                className="flex-1 py-2.5 bg-blue-600 text-white font-semibold text-xs rounded-md hover:bg-blue-700 transition-colors shadow-sm"
              >
                Return to Events
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
