import React from 'react';

export function Skeleton({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={` rounded-md bg-[var(--surface-2)]/60 dark:bg-white/[0.06] ${className}`}
      {...props}
    />
  );
}

export function SkeletonTable({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  const safeCols = Math.max(1, Math.min(8, Math.floor(cols)));
  const gridStyle: React.CSSProperties = { gridTemplateColumns: `repeat(${safeCols}, minmax(0, 1fr))` };
  const widths = ['w-8', 'w-24', 'w-14', 'w-16', 'w-12', 'w-20', 'w-10', 'w-16'];

  return (
    <div className="w-full space-y-2" aria-hidden="true">
      <div className="grid items-center gap-3 py-2 px-2 border-b border-[var(--border-subtle)]" style={gridStyle}>
        {Array.from({ length: safeCols }, (_, col) => (
          <Skeleton key={`header-${col}`} className={`h-3 ${widths[col % widths.length]} rounded`} />
        ))}
      </div>
      <div className="space-y-2 pt-1">
        {Array.from({ length: rows }, (_, row) => (
          <div
            key={`row-${row}`}
            className="grid items-center gap-3 py-3 px-2 rounded-lg bg-[var(--surface-1)]/40 border border-[var(--border-subtle)]/40"
            style={gridStyle}
          >
            {Array.from({ length: safeCols }, (_, col) => (
              <Skeleton key={`cell-${row}-${col}`} className={`h-4 ${widths[(col + 1) % widths.length]} max-w-full rounded`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-6 w-6 rounded-md" />
      </div>
      <Skeleton className="h-7 w-16" />
      <Skeleton className="h-2.5 w-28" />
    </div>
  );
}
