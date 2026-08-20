import React from 'react';
import { APP_MARK_SRC, APP_NAME, COMPANY_NAME } from '../lib/brand';

const SIZE_CLASS: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const TEXT_CLASS: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
};

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onDark?: boolean;
  showName?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 'md',
  onDark = false,
  showName = true,
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 min-w-0 ${className}`}>
      <div
        className={`${SIZE_CLASS[size]} rounded-full overflow-hidden shrink-0 flex items-center justify-center ${
          onDark ? 'bg-white shadow-sm' : 'bg-slate-100 border border-slate-200'
        }`}
      >
        <img
          src={APP_MARK_SRC}
          alt={COMPANY_NAME}
          className="h-[78%] w-[78%] object-contain"
        />
      </div>
      {showName && (
        <span
          className={`${TEXT_CLASS[size]} font-semibold tracking-tight leading-tight truncate ${
            onDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          {APP_NAME}
        </span>
      )}
    </div>
  );
};
