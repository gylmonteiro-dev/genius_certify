import React from 'react';

interface CertificateHtmlViewerProps {
  title: string;
  html?: string;
  src?: string;
  className?: string;
  layout?: 'single' | 'scroll';
}

export const CertificateHtmlViewer: React.FC<CertificateHtmlViewerProps> = ({
  title,
  html,
  src,
  className,
  layout = 'single',
}) => {
  return (
    <iframe
      title={title}
      srcDoc={html || undefined}
      src={html ? undefined : src}
      sandbox="allow-same-origin"
      className={
        className ??
        (layout === 'scroll'
          ? 'w-full min-h-[320px] h-[min(80vh,920px)] rounded-xl border border-slate-200 bg-[#f4f4f2]'
          : 'w-full aspect-[11/8.5] min-h-[240px] rounded-xl border border-slate-200 bg-[#f4f4f2]')
      }
    />
  );
};
