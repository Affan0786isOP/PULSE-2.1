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
  return (
    <div className="w-full space-y-2">
      {/* Table Header Skeleton */}
      <div className="flex items-center justify-between py-2 px-2 border-b border-[var(--border-subtle)]">
        <Skeleton className="h-3 w-10 rounded" />
        <Skeleton className="h-3 w-20 rounded" />
        <Skeleton className="h-3 w-14 rounded" />
      </div>
      {/* Table Rows Skeleton */}
      <div className="space-y-2 pt-1">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={`m-tr-skel-${r}`}
            className="flex items-center justify-between py-2.5 px-2 rounded-lg bg-[var(--surface-1)]/40 border border-[var(--border-subtle)]/40"
          >
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-5 w-5 rounded-md" />
              <div className="space-y-1">
                <Skeleton className="h-3.5 w-24 rounded" />
                <Skeleton className="h-2.5 w-14 rounded" />
              </div>
            </div>
            <Skeleton className="h-4 w-12 rounded" />
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
