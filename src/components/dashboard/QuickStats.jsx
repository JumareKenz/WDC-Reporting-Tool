import React, { useMemo } from 'react';
import Panel from './Panel';
import { formatPct, getRelativeTime } from './dashboardUtils';
import { ListSkeleton, SectionError } from './Skeletons';
import { formatNumber } from '../../utils/formatters';

/**
 * This Period at a Glance — compact label/value rows. Any value that can't be
 * sourced from real data renders "—" (never fabricated).
 *
 * "AI Reports Generated" has no backing endpoint (intelligence-report jobs live
 * in Redis with no list/count API), so it always shows "—".
 * TODO(backend): expose a count of generated intelligence reports per period.
 */
const StatRow = ({ label, value, sub }) => (
  <div className="flex items-center justify-between gap-3 border-b border-neutral-100 py-2.5 last:border-0">
    <span className="text-[13px] text-neutral-500">{label}</span>
    <span className="min-w-0 truncate text-right text-[13px] font-medium text-neutral-900" title={typeof value === 'string' ? value : undefined}>
      {value}
      {sub && <span className="ml-1 font-normal text-neutral-400">{sub}</span>}
    </span>
  </div>
);

const QuickStats = ({ lgas = [], activityItems = [], lastUpdated, loading, error, onRetry }) => {
  const stats = useMemo(() => {
    // Most active LGA — highest submission count.
    const mostActiveLga = [...lgas]
      .filter((l) => (l.submitted_count ?? 0) > 0)
      .sort((a, b) => (b.submitted_count ?? 0) - (a.submitted_count ?? 0))[0] || null;

    // Most active ward — highest submission count; "—" on a tie (no clear winner).
    const wardCounts = new Map();
    for (const it of activityItems) {
      const key = it.ward_name || it.id;
      if (!key) continue;
      const prev = wardCounts.get(key) || { count: 0, lga: it.lga_name };
      wardCounts.set(key, { count: prev.count + 1, lga: it.lga_name });
    }
    let topWard = null;
    let max = 0;
    let tie = false;
    for (const [name, { count, lga }] of wardCounts) {
      if (count > max) { max = count; topWard = { name, lga }; tie = false; }
      else if (count === max) tie = true;
    }
    const mostActiveWard = !tie && topWard ? topWard : null;

    const rated = lgas.filter((l) => l.submission_rate !== null && l.submission_rate !== undefined);
    const avgRate = rated.length
      ? Math.round(rated.reduce((s, l) => s + l.submission_rate, 0) / rated.length)
      : null;

    return { mostActiveLga, mostActiveWard, avgRate };
  }, [lgas, activityItems]);

  let body;
  if (loading) body = <ListSkeleton rows={5} />;
  else if (error) body = <SectionError message="Could not load summary." onRetry={onRetry} />;
  else {
    body = (
      <div>
        <StatRow
          label="Most Active LGA"
          value={stats.mostActiveLga?.name || '—'}
          sub={stats.mostActiveLga ? `(${formatNumber(stats.mostActiveLga.submitted_count)})` : null}
        />
        <StatRow
          label="Most Active Ward"
          value={stats.mostActiveWard?.name || '—'}
          sub={stats.mostActiveWard?.lga ? `· ${stats.mostActiveWard.lga}` : null}
        />
        <StatRow label="Avg. Submission Rate" value={formatPct(stats.avgRate)} />
        <StatRow label="AI Reports Generated" value="—" />
        <StatRow label="Last Updated" value={lastUpdated ? getRelativeTime(lastUpdated) : '—'} />
      </div>
    );
  }

  return <Panel title="This Period at a Glance">{body}</Panel>;
};

export default QuickStats;
