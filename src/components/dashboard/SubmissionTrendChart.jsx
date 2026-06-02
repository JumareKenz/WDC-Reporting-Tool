import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import Panel from './Panel';
import { CHART } from './dashboardUtils';
import { ChartSkeleton, SectionError, EmptyState } from './Skeletons';
import { formatNumber } from '../../utils/formatters';

/**
 * Submission Volume — last 6 months. Grouped bars: Submitted vs Expected.
 *
 * NOTE: /analytics/trends does not expose a historical expected-submission count,
 * so "Expected" is the current ward total drawn as a flat reference across every
 * month. TODO(backend): expose per-period expected counts for a true comparison.
 */
const TrendTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload || {};
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-medium text-neutral-900">{label}</p>
      <p className="text-neutral-600">Submitted: <span className="font-semibold text-neutral-900">{formatNumber(d.submitted ?? 0)}</span></p>
      <p className="text-neutral-600">Expected: <span className="font-semibold text-neutral-900">{d.expected ? formatNumber(d.expected) : '—'}</span></p>
      <p className="text-neutral-600">Rate: <span className="font-semibold text-neutral-900">{d.rate === null || d.rate === undefined ? '—' : `${d.rate}%`}</span></p>
    </div>
  );
};

const SubmissionTrendChart = ({ trends = [], expected, loading, error, onRetry }) => {
  const data = useMemo(
    () => trends.map((t) => {
      const exp = expected ?? t.total_wards ?? null;
      return {
        month: t.month,
        submitted: t.submitted ?? 0,
        expected: exp,
        rate: exp ? Math.round(((t.submitted ?? 0) / exp) * 100) : null,
      };
    }),
    [trends, expected],
  );

  let body;
  if (loading) {
    body = <ChartSkeleton height={220} />;
  } else if (error) {
    body = <SectionError message="Could not load submission trends." onRetry={onRetry} />;
  } else if (data.length < 2) {
    body = (
      <EmptyState
        icon={TrendingUp}
        title="Not enough historical data yet"
        description="The trend appears once at least two months of submissions are recorded. Check back next month."
      />
    );
  } else {
    body = (
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#737373' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#737373' }} axisLine={false} tickLine={false} width={36} />
            <Tooltip content={<TrendTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
            <Bar dataKey="expected" name="Expected" fill={CHART.neutral} radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Bar dataKey="submitted" name="Submitted" radius={[3, 3, 0, 0]} maxBarSize={28}>
              {data.map((d, i) => (
                <Cell key={d.month} fill={i === data.length - 1 ? CHART.primaryBright : CHART.primary} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 flex items-center gap-4 px-1 text-[11px] text-neutral-500">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART.primary }} /> Submitted</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART.neutral }} /> Expected</span>
        </div>
      </div>
    );
  }

  return (
    <Panel title="Submission Volume" subtitle="Last 6 Months">
      {body}
    </Panel>
  );
};

export default SubmissionTrendChart;
