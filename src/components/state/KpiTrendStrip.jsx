import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, FileText, CheckCircle, RotateCcw } from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

/**
 * KpiTrendStrip
 * Period-over-period KPI cards derived from the /analytics/trends series
 * ([{ month, submitted, approved, returned }]). Shows the latest period's value
 * with a delta vs the previous period. With < 2 data points, deltas are hidden
 * (no fabricated trend).
 *
 * Props:
 *  - trends: Array<{ month, submitted, approved, returned }>
 *  - loading: boolean
 */

const computeDelta = (curr, prev) => {
  if (prev === undefined || prev === null) return null;
  const diff = curr - prev;
  if (prev === 0) return diff === 0 ? { pct: 0, dir: 'flat', diff } : { pct: null, dir: diff > 0 ? 'up' : 'down', diff };
  return { pct: Math.round((diff / prev) * 100), dir: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat', diff };
};

const KPI_DEFS = [
  { key: 'submitted', label: 'Submitted', icon: FileText, accent: 'text-blue-600', bg: 'bg-blue-100', goodUp: true },
  { key: 'approved', label: 'Approved', icon: CheckCircle, accent: 'text-primary-600', bg: 'bg-primary-100', goodUp: true },
  { key: 'returned', label: 'Returned', icon: RotateCcw, accent: 'text-red-600', bg: 'bg-red-100', goodUp: false },
];

const KpiTrendStrip = ({ trends = [], loading = false }) => {
  const { latest, previous, periodLabel } = useMemo(() => {
    const n = trends.length;
    return {
      latest: n > 0 ? trends[n - 1] : null,
      previous: n > 1 ? trends[n - 2] : null,
      periodLabel: n > 0 ? trends[n - 1].month : '',
    };
  }, [trends]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-white rounded-xl border border-neutral-200 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!latest) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      {KPI_DEFS.map(({ key, label, icon: Icon, accent, bg, goodUp }) => {
        const value = latest[key] || 0;
        const delta = previous ? computeDelta(value, previous[key] || 0) : null;
        const positive = delta && (goodUp ? delta.dir === 'up' : delta.dir === 'down');
        const negative = delta && delta.dir !== 'flat' && !positive;

        return (
          <div key={key} className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 ${bg} rounded-lg`}>
                  <Icon className={`w-5 h-5 ${accent}`} />
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{label}</p>
                  <p className="text-2xl font-bold text-neutral-900">{formatNumber(value)}</p>
                </div>
              </div>
              {delta && delta.dir !== 'flat' && (
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded ${
                    positive ? 'text-primary-700 bg-primary-50' : negative ? 'text-red-700 bg-red-50' : 'text-neutral-500 bg-neutral-100'
                  }`}
                  title={`vs previous period (${previous?.month || '—'})`}
                >
                  {delta.dir === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {delta.pct === null ? 'new' : `${Math.abs(delta.pct)}%`}
                </span>
              )}
              {delta && delta.dir === 'flat' && (
                <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded text-neutral-500 bg-neutral-100">
                  <Minus className="w-3 h-3" /> 0%
                </span>
              )}
            </div>
            {periodLabel && (
              <p className="text-xs text-neutral-400 mt-2">Latest period: {periodLabel}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default KpiTrendStrip;
