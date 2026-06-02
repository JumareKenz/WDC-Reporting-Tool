import React, { useMemo } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import Panel from './Panel';
import { lgaStatus } from './dashboardUtils';
import { ListSkeleton, SectionError } from './Skeletons';

/**
 * Needs Attention — up to 5 LGAs with the lowest coverage / not submitted.
 * When every LGA is ≥80%, shows a green success state instead of an empty box.
 */
const NeedsAttention = ({ lgas = [], period, loading, error, onViewLga, onRetry }) => {
  const worst = useMemo(
    () => [...lgas]
      .filter((l) => (l.submission_rate ?? 0) < 80)
      .sort((a, b) => (a.submission_rate ?? 0) - (b.submission_rate ?? 0))
      .slice(0, 5),
    [lgas],
  );

  let body;
  if (loading) body = <ListSkeleton rows={5} />;
  else if (error) body = <SectionError message="Could not load attention list." onRetry={onRetry} />;
  else if (lgas.length === 0) {
    body = (
      <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
        <AlertTriangle className="h-5 w-5 text-neutral-300" />
        <p className="text-[13px] text-neutral-500">No LGA data for this period.</p>
      </div>
    );
  } else if (worst.length === 0) {
    body = (
      <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
        <CheckCircle2 className="h-6 w-6 text-emerald-500" />
        <p className="text-[13px] font-medium text-emerald-700">All LGAs on track this period</p>
        <p className="text-xs text-neutral-500">Every LGA is at 80% coverage or above.</p>
      </div>
    );
  } else {
    body = (
      <ul className="space-y-1.5">
        {worst.map((lga) => {
          const status = lgaStatus(lga, period);
          const sub = (lga.submitted_count ?? 0) === 0
            ? (status.label === 'Overdue' ? 'Overdue' : '0 submissions')
            : `Partial · ${lga.submission_rate}%`;
          return (
            <li key={lga.id ?? lga.name} className="flex items-center gap-2.5">
              <span className={`h-2 w-2 flex-shrink-0 rounded-full ${status.tone.dot}`} />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-neutral-800" title={lga.name}>{lga.name}</span>
              <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${status.tone.badge}`}>{sub}</span>
              {onViewLga && (
                <button
                  type="button"
                  onClick={() => onViewLga(lga)}
                  className="flex-shrink-0 text-[12px] font-medium text-primary-600 hover:text-primary-800"
                >
                  View
                </button>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return <Panel title="Needs Attention">{body}</Panel>;
};

export default NeedsAttention;
