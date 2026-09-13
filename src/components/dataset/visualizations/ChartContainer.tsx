import React from 'react';

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  badge?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  height?: number | string;
  className?: string;
  id?: string;
  ariaLabel?: string;
}

export function ChartContainer({
  title,
  subtitle,
  badge,
  action,
  children,
  height,
  className = '',
  id,
  ariaLabel
}: ChartContainerProps) {
  return (
    <div
      id={id}
      role="region"
      aria-label={ariaLabel || title}
      className={`relative bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5 flex flex-col overflow-hidden transition-all duration-200 ${className}`}
    >
      {/* Precision reticle crosshairs in four corners (PULSE scientific signature) */}
      <div className="absolute top-2 left-2 font-mono text-[9px] text-[var(--border-default)] select-none pointer-events-none">+</div>
      <div className="absolute top-2 right-2 font-mono text-[9px] text-[var(--border-default)] select-none pointer-events-none">+</div>
      <div className="absolute bottom-2 left-2 font-mono text-[9px] text-[var(--border-default)] select-none pointer-events-none">+</div>
      <div className="absolute bottom-2 right-2 font-mono text-[9px] text-[var(--border-default)] select-none pointer-events-none">+</div>

      {/* Header section */}
      <div className="flex flex-wrap items-start justify-between gap-2.5 mb-3.5 pb-2.5 border-b border-[var(--border-subtle)]">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-heading font-bold text-sm text-[var(--text-main)] tracking-wide uppercase">
              {title}
            </h3>
            {badge && (
              <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider bg-[var(--cyan-badge-bg)] text-[var(--cyan-primary)] border border-[var(--cyan-badge-border)]">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] font-mono text-[var(--text-muted)] leading-tight">
              {subtitle}
            </p>
          )}
        </div>

        {action && (
          <div className="flex items-center gap-2 self-start shrink-0">
            {action}
          </div>
        )}
      </div>

      {/* Visualization Canvas Body */}
      <div 
        className="w-full flex-1 flex flex-col min-w-0" 
        style={height ? { minHeight: height, height } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
