import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import Panel from './Panel';
import { CHART, formatPct } from './dashboardUtils';
import { Skeleton, SectionError, EmptyState } from './Skeletons';
import { formatNumber } from '../../utils/formatters';

/**
 * State Coverage donut — LGA categories (Complete / Partial / Not Submitted),
 * max 3 segments. Centre shows the overall submission rate. Donut, not pie.
 */
const CoverageDonut = ({ lgas = [], submissionRate, loading, error, onRetry }) => {
  const segments = useMemo(() => {
    const complete = lgas.filter((l) => (l.submission_rate ?? 0) >= 90).length;
    const notSubmitted = lgas.filter((l) => (l.submitted_count ?? 0) === 0).length;
    const partial = lgas.length - complete - notSubmitted;
    return [
      { name: 'Complete', value: complete, color: CHART.green },
      { name: 'Partial', value: partial, color: CHART.amber },
      { name: 'Not Submitted', value: notSubmitted, color: CHART.red },
    ].filter((s) => s.value > 0);
  }, [lgas]);

  let body;
  if (loading) {
    body = (
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-[140px] w-[140px] rounded-full" />
        <Skeleton className="h-4 w-40" />
      </div>
    );
  } else if (error) {
    body = <SectionError message="Could not load coverage." onRetry={onRetry} />;
  } else if (segments.length === 0) {
    body = <EmptyState icon={PieIcon} title="No coverage data" description="Coverage appears once LGAs report." />;
  } else {
    body = (
      <div>
        <div className="relative" style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={segments}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={72}
                paddingAngle={2}
                startAngle={90}
                endAngle={-270}
                stroke="none"
              >
                {segments.map((s) => <Cell key={s.name} fill={s.color} />)}
              </Pie>
              <Tooltip formatter={(value, name) => [formatNumber(value), name]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[26px] font-semibold leading-none text-neutral-900">{formatPct(submissionRate)}</span>
            <span className="mt-0.5 text-[11px] uppercase tracking-[0.05em] text-neutral-400">Coverage</span>
          </div>
        </div>
        <ul className="mt-3 space-y-1.5">
          {segments.map((s) => (
            <li key={s.name} className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-2 text-neutral-600">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                {s.name}
              </span>
              <span className="font-semibold text-neutral-800">{formatNumber(s.value)} LGAs</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return <Panel title="State Coverage">{body}</Panel>;
};

export default CoverageDonut;
