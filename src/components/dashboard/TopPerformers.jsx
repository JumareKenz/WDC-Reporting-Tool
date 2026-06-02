import React, { useMemo } from 'react';
import { Award } from 'lucide-react';
import Panel from './Panel';
import { rateTone, formatPct } from './dashboardUtils';
import { ListSkeleton, SectionError, EmptyState } from './Skeletons';

/**
 * Best-performing LGAs — top 5 by submission rate. Plain ranked list, no chart.
 */
const TopPerformers = ({ lgas = [], loading, error, onRetry }) => {
  const top = useMemo(
    () => [...lgas]
      .filter((l) => (l.submitted_count ?? 0) > 0)
      .sort((a, b) => (b.submission_rate ?? 0) - (a.submission_rate ?? 0))
      .slice(0, 5),
    [lgas],
  );

  let body;
  if (loading) body = <ListSkeleton rows={5} />;
  else if (error) body = <SectionError message="Could not load performers." onRetry={onRetry} />;
  else if (top.length === 0) body = <EmptyState icon={Award} title="No submissions yet" description="Rankings appear once LGAs report." />;
  else {
    body = (
      <ol className="space-y-1.5">
        {top.map((lga, i) => {
          const tone = rateTone(lga.submission_rate);
          return (
            <li key={lga.id ?? lga.name} className="flex items-center gap-3">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-semibold text-neutral-500">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-neutral-800" title={lga.name}>{lga.name}</span>
              <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${tone.badge}`}>{formatPct(lga.submission_rate)}</span>
            </li>
          );
        })}
      </ol>
    );
  }

  return <Panel title="Best Performing LGAs" subtitle="This period">{body}</Panel>;
};

export default TopPerformers;
