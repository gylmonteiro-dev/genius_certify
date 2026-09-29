import React, { useState } from 'react';
import { coverObjectPosition, DEFAULT_EVENT_COVER, resolveCoverSrc } from '../lib/eventCover';

interface EventCoverImageProps {
  url?: string | null;
  focusX?: number | null;
  focusY?: number | null;
  priority?: boolean;
  alt?: string;
  className?: string;
  children?: React.ReactNode;
}

export const EventCoverImage: React.FC<EventCoverImageProps> = ({
  url,
  focusX,
  focusY,
  priority = false,
  alt = '',
  className = '',
  children,
}) => {
  const [failed, setFailed] = useState(false);
  const src = resolveCoverSrc(url, failed);
  const usingDefault = src === DEFAULT_EVENT_COVER;

  return (
    <div className={`relative aspect-video w-full overflow-hidden bg-slate-100 ${className}`}>
      <img
        src={src}
        alt={alt}
        width={640}
        height={360}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'low'}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: coverObjectPosition(focusX, focusY) }}
        onError={() => {
          if (!usingDefault) setFailed(true);
        }}
      />
      {children}
    </div>
  );
};
