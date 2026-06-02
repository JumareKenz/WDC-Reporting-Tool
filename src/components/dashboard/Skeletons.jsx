import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Loading / error / empty primitives shared by every dashboard section.
 * Each section owns its own state so one slow or failed fetch never blanks
 * the whole page.
 */

// Generic grey block. Pulse is an interactive/affordance cue, not data motion.
export const Skeleton = ({ className = '', ...props }) => (
  <div className={`animate-pulse rounded bg-neutral-200/70 ${className}`} {...props} />
);

// A bordered card shell so skeletons match the real section footprint.
export const SkeletonCard = ({ className = '', children }) => (
  <div className={`rounded-xl border border-neutral-200 bg-white p-4 ${className}`}>{children}</div>
);

export const KpiStripSkeleton = () => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
    {Array.from({ length: 5 }).map((_, i) => (
      <SkeletonCard key={i}>
        <Skeleton className="h-7 w-20" />
        <Skeleton className="mt-2 h-3 w-24" />
        <Skeleton className="mt-3 h-3 w-12" />
      </SkeletonCard>
    ))}
  </div>
);

export const ChartSkeleton = ({ height = 220 }) => (
  <div className="flex items-end gap-2" style={{ height }}>
    {[60, 80, 45, 90, 70, 100].map((h, i) => (
      <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
    ))}
  </div>
);

export const ListSkeleton = ({ rows = 5 }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-10" />
      </div>
    ))}
  </div>
);

export const TableSkeleton = ({ rows = 8 }) => (
  <div className="space-y-2">
    <Skeleton className="h-9 w-full" />
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-11 w-full" />
    ))}
  </div>
);

// Inline, recoverable error for a single section.
export const SectionError = ({ message = 'Could not load this section.', onRetry }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
    <AlertTriangle className="h-6 w-6 text-red-500" />
    <p className="text-[13px] text-neutral-600">{message}</p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
      >
        <RefreshCw className="h-3 w-3" /> Retry
      </button>
    )}
  </div>
);

// Meaningful empty state — never a blank box.
export const EmptyState = ({ icon: Icon, title, description }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
    {Icon && (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100">
        <Icon className="h-5 w-5 text-neutral-400" />
      </div>
    )}
    <p className="text-[13px] font-medium text-neutral-700">{title}</p>
    {description && <p className="max-w-xs text-xs text-neutral-500">{description}</p>}
  </div>
);
