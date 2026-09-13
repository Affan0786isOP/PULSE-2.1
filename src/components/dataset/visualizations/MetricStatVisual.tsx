import React from 'react';
import { formatValueWithUnit } from './formatting';

interface MetricStatVisualProps {
  label: string;
  value: number | string | null | undefined;
  unit?: string;
  subtext?: string;
  badge?: string;
  badgeType?: 'primary' | 'success' | 'warning' | 'neutral';
  icon?: React.ElementType;
  className?: string;
  id?: string;
}

export function MetricStatVisual({
  label,
  value,
  unit,
  subtext,
  badge,
  badgeType = 'primary',
  icon: Icon,
  className = '',
  id
}: MetricStatVisualProps) {
  const formattedValue = typeof value === 'number'
    ? formatValueWithUnit(value, undefined, value % 1 === 0 ? 0 : 1)
    : (value ?? '—');

  const badgeStyles = {
    primary: 'bg-[var(--cyan-badge-bg)] text-[var(--cyan-primary)] border-[var(--cyan-badge-border)]',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    neutral: 'bg-[var(--bg-panel)] text-[var(--text-muted)] border-[var(--border-subtle)]',
  }[badgeType];

  return (
    <div
      id={id}
      className={`bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-colors rounded-xl p-4 flex flex-col justify-between ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] truncate">
          {label}
        </span>
        {Icon && (
          <div className="w-6 h-6 rounded-md bg-[var(--bg-panel)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--cyan-primary)] shrink-0">
            <Icon size={13} />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 my-1">
        <span className="text-xl sm:text-2xl font-mono font-bold text-[var(--text-main)] tabular-nums tracking-tight">
          {formattedValue}
        </span>
        {unit && (
          <span className="text-xs font-mono text-[var(--text-muted)]">
            {unit}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 mt-1">
        {subtext ? (
          <span className="text-[10px] font-mono text-[var(--text-secondary)] truncate">
            {subtext}
          </span>
        ) : <div />}

        {badge && (
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border shrink-0 ${badgeStyles}`}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
