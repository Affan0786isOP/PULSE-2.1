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
      className={`relative bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-3.5 sm:p-4 flex flex-col overflow-hidden transition-all duration-200 ${className}`}
    >
      {/* Header section */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-[var(--border-subtle)]">
        <div className="flex-1 min-w-[160px]">
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-bold text-xs sm:text-sm text-[var(--text-main)] tracking-wide uppercase">
              {title}
            </h3>
            {badge && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-[var(--cyan-badge-bg)] text-[var(--cyan-primary)] border border-[var(--cyan-badge-border)]">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[10px] font-mono text-[var(--text-muted)] leading-tight mt-0.5">
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
