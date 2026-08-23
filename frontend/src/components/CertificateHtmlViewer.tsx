import React from 'react';

interface CertificateHtmlViewerProps {
  title: string;
  html?: string;
  src?: string;
  className?: string;
}

export const CertificateHtmlViewer: React.FC<CertificateHtmlViewerProps> = ({
  title,
  html,
  src,
  className,
}) => {
  return (
    <iframe
      title={title}
      srcDoc={html || undefined}
      src={html ? undefined : src}
      sandbox="allow-same-origin"
      className={
        className ??
        'w-full aspect-[11/8.5] min-h-[240px] rounded-xl border border-slate-200 bg-[#f4f4f2]'
      }
    />
  );
};
