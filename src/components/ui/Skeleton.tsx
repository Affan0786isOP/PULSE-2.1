import React from 'react';

export function Skeleton({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-md bg-[var(--surface-2)]/60 dark:bg-white/[0.06] ${className}`}
      {...props}
    />
  );
}

export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-3">
      {/* Table Header Skeleton */}
      <div className="flex items-center gap-4 py-3 px-4 border-b border-[var(--border-subtle)]">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton
            key={`th-skel-${i}`}
            className={`h-4 ${i === 0 ? 'w-12' : i === 1 ? 'w-32' : 'flex-1'} rounded`}
          />
        ))}
      </div>
      {/* Table Rows Skeleton */}
      <div className="space-y-2.5 pt-1">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={`tr-skel-${r}`}
            className="flex items-center gap-4 py-3.5 px-4 rounded-lg bg-[var(--surface-1)]/40 border border-[var(--border-subtle)]/40"
          >
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={`td-skel-${r}-${c}`}
                className={`h-4 ${
                  c === 0 ? 'w-8' : c === 1 ? 'w-28 sm:w-40' : c === cols - 1 ? 'w-16 ml-auto' : 'flex-1'
                } rounded`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-7 w-7 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-36" />
    </div>
  );
}

export function SkeletonChart({ height = 'h-64', title = true }: { height?: string; title?: boolean }) {
  return (
    <div className="p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] flex flex-col justify-between">
      {title && (
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--border-subtle)]">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-20" />
        </div>
      )}
      <div className={`${height} w-full flex items-end gap-3 pt-4 pb-2 px-2`}>
        {Array.from({ length: 8 }).map((_, i) => {
          const heights = ['h-24', 'h-40', 'h-32', 'h-52', 'h-44', 'h-36', 'h-28', 'h-48'];
          return (
            <div key={`bar-${i}`} className="flex-1 flex flex-col items-center gap-2">
              <Skeleton className={`w-full ${heights[i % heights.length]} rounded-t`} />
              <Skeleton className="w-6 h-3 rounded" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
