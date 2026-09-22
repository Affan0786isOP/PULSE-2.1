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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] border font-mono text-[11px] font-medium tracking-wide select-none ${
        verified
          ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
          : 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
      } ${className}`}
    >
      <span className="relative flex h-2 w-2">
        {verified && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            verified ? 'bg-[#10B981]' : 'bg-[#EF4444]'
          }`}
        />
      </span>
      <span>{label}</span>
    </div>
  );
};
