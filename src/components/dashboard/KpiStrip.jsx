import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  TONE, rateTone, formatStat, formatPct, formatRatio, computeDelta, countReportingLgas,
} from './dashboardUtils';
import { KpiStripSkeleton, SectionError } from './Skeletons';

/**
 * KPI strip — five equal cards: Total Submissions, Submission Rate,
 * LGAs Reporting, Wards Reporting, Pending/Overdue. Each shows a value, a label,
 * a period-over-period trend (grey when no prior data) and a 2px semantic left
 * border. Metrics that can't be computed render "—", never 0.
 */

const Delta = ({ delta, goodUp = true }) => {
  if (!delta) return <span className="text-[11px] font-medium text-neutral-400">—</span>;
  if (delta.dir === 'flat') {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-neutral-400">
        <Minus className="h-3 w-3" /> 0%
      </span>
    );
  }
  const positive = goodUp ? delta.dir === 'up' : delta.dir === 'down';
  const Icon = delta.dir === 'up' ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
      <Icon className="h-3 w-3" />
      {delta.pct === null ? 'new' : `${Math.abs(delta.pct)}%`}
    </span>
  );
};

const KpiCard = ({ tone, value, label, sub, delta, goodUp }) => (
  <div className={`rounded-xl border border-neutral-200 border-l-2 bg-white p-4 ${tone.border}`}>
    <div className="flex items-start justify-between gap-2">
      <p className="text-[28px] font-semibold leading-none text-neutral-900">{value}</p>
      <Delta delta={delta} goodUp={goodUp} />
    </div>
    <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.05em] text-neutral-500">{label}</p>
    {sub && <p className="mt-0.5 text-xs text-neutral-400">{sub}</p>}
  </div>
);

const KpiStrip = ({ overview, prior, lgas = [], loading, error, onRetry }) => {
  if (loading) return <KpiStripSkeleton />;
  if (error) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white">
        <SectionError message="Could not load key metrics." onRetry={onRetry} />
      </div>
    );
  }

  const o = overview || {};
  const totalLgas = o.total_lgas ?? null;
  const totalWards = o.total_wards ?? null;
  const submitted = o.total_submitted ?? null;
  const missing = o.total_missing ?? null;
  const rate = o.submission_rate ?? null;
  const reporting = lgas.length ? countReportingLgas(lgas) : null;

  const lgaRatio = (reporting !== null && totalLgas) ? Math.round((reporting / totalLgas) * 100) : null;
  const wardRatio = (submitted !== null && totalWards) ? Math.round((submitted / totalWards) * 100) : null;

  const cards = [
    {
      tone: TONE.blue,
      value: formatStat(submitted),
      label: 'Total Submissions',
      sub: 'reports received',
      delta: computeDelta(submitted, prior?.total_submitted),
      goodUp: true,
    },
    {
      tone: rateTone(rate),
      value: formatPct(rate),
      label: 'Submission Rate',
      sub: 'of expected wards',
      delta: computeDelta(rate, prior?.submission_rate),
      goodUp: true,
    },
    {
      tone: rateTone(lgaRatio),
      value: reporting === null ? '—' : formatRatio(reporting, totalLgas),
      label: 'LGAs Reporting',
      sub: 'submitted ≥ 1 report',
      delta: null, // prior LGA-reporting count not fetched — grey, never fabricated
      goodUp: true,
    },
    {
      tone: rateTone(wardRatio),
      value: formatRatio(submitted, totalWards),
      label: 'Wards Reporting',
      sub: 'of all wards',
      delta: computeDelta(submitted, prior?.total_submitted),
      goodUp: true,
    },
    {
      tone: (missing ?? 0) > 0 ? TONE.red : TONE.green,
      value: formatStat(missing),
      label: 'Pending / Overdue',
      sub: 'not yet received',
      delta: computeDelta(missing, prior?.total_missing),
      goodUp: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <KpiCard key={c.label} {...c} />
      ))}
    </div>
  );
};

export default KpiStrip;
