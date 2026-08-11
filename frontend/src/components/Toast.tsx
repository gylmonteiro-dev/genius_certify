import React, { useEffect } from 'react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed bottom-5 right-5 bg-[#0b1c30] text-white px-4 py-3 rounded-lg shadow-2xl z-50 flex items-center gap-3 border border-[#0051d5]/40 animate-in fade-in slide-in-from-bottom-5 duration-200">
      <span className="material-symbols-outlined text-[#10b981]">check_circle</span>
      <span className="text-xs font-medium">{message}</span>
      <button onClick={onClose} className="text-gray-400 hover:text-white ml-2">
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
  );
};
