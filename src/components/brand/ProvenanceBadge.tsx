import React from 'react';

interface ProvenanceBadgeProps {
  label?: string;
  verified?: boolean;
  className?: string;
}

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({
  label = 'HMAC-SHA256 VERIFIED',
  verified = true,
  className = '',
}) => {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border font-mono text-[11px] font-semibold tracking-wider select-none ${
        verified
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
          : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
      } ${className}`}
    >
      <span className="relative flex h-2 w-2">
        {verified && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            verified ? 'bg-emerald-400' : 'bg-rose-400'
          }`}
        />
      </span>
      <span>{label}</span>
    </div>
  );
};
