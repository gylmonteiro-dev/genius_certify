import React from 'react';
import { Link, NavLink } from 'react-router-dom';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-semibold transition-colors ${
      isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
    }`;

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] font-sans">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
              C
            </div>
            <span className="font-semibold text-lg tracking-tight">CertifyPro</span>
          </Link>
          <nav className="flex items-center gap-5">
            <NavLink to="/validar" className={linkClass}>
              Validate
            </NavLink>
            <NavLink to="/eventos" className={linkClass}>
              Events
            </NavLink>
            <Link
              to="/"
              className="text-sm font-semibold px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800"
            >
              Admin login
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
};
