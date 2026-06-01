import React, { useMemo } from 'react';
import { AlertTriangle, TrendingDown, TrendingUp, Award, Info } from 'lucide-react';

/**
 * InsightCallouts
 * Rule-based, data-driven insights for the state dashboard. Each rule only emits
 * a callout when a real threshold is crossed; the component renders nothing when
 * there are no insights (no empty box, no fabricated commentary).
 *
 * Props:
 *  - lgas: Array<NormalizedLga>  (from useLGAComparison, see analytics.normalizeLga)
 *  - trends: Array<{ month, submitted, approved, returned }>
 */

const STYLES = {
  critical: { icon: AlertTriangle, wrap: 'bg-red-50 border-red-200', icon_c: 'text-red-500', title: 'text-red-800', body: 'text-red-700' },
  warning: { icon: TrendingDown, wrap: 'bg-amber-50 border-amber-200', icon_c: 'text-amber-500', title: 'text-amber-800', body: 'text-amber-700' },
  positive: { icon: Award, wrap: 'bg-primary-50 border-primary-200', icon_c: 'text-primary-600', title: 'text-primary-800', body: 'text-primary-700' },
  info: { icon: Info, wrap: 'bg-blue-50 border-blue-200', icon_c: 'text-blue-500', title: 'text-blue-800', body: 'text-blue-700' },
  up: { icon: TrendingUp, wrap: 'bg-primary-50 border-primary-200', icon_c: 'text-primary-600', title: 'text-primary-800', body: 'text-primary-700' },
};

const buildInsights = (lgas, trends) => {
  const out = [];

  // 1. Critical-coverage LGAs (<50%)
  const critical = lgas
    .filter((l) => (l.submission_rate ?? 0) < 50)
    .sort((a, b) => (a.submission_rate ?? 0) - (b.submission_rate ?? 0));
  if (critical.length > 0) {
    const names = critical.slice(0, 3).map((l) => `${l.name} (${l.submission_rate}%)`).join(', ');
    out.push({
      type: 'critical',
      title: `${critical.length} LGA${critical.length > 1 ? 's' : ''} below 50% coverage`,
      body: `${names}${critical.length > 3 ? `, +${critical.length - 3} more` : ''}. These need immediate follow-up.`,
    });
  }

  // 2. Period-over-period submission change
  if (trends.length > 1) {
    const last = trends[trends.length - 1];
    const prev = trends[trends.length - 2];
    const lastV = last.submitted || 0;
    const prevV = prev.submitted || 0;
    if (prevV > 0) {
      const pct = Math.round(((lastV - prevV) / prevV) * 100);
      if (pct <= -25) {
        out.push({
          type: 'warning',
          title: `Submissions fell ${Math.abs(pct)}% in ${last.month}`,
          body: `Down from ${prevV} to ${lastV} vs ${prev.month}. Check for blockers in low-activity LGAs.`,
        });
      } else if (pct >= 25) {
        out.push({
          type: 'up',
          title: `Submissions rose ${pct}% in ${last.month}`,
          body: `Up from ${prevV} to ${lastV} vs ${prev.month}. Momentum is improving.`,
        });
      }
    }
  }

  // 3. Top performer
  const top = [...lgas].sort((a, b) => (b.submission_rate ?? 0) - (a.submission_rate ?? 0))[0];
  if (top && (top.submission_rate ?? 0) >= 90) {
    out.push({
      type: 'positive',
      title: `${top.name} is leading at ${top.submission_rate}%`,
      body: `${top.submitted_count} of ${top.total_wards} wards reported — a model for other LGAs.`,
    });
  }

  // 4. Returned-report pressure (last period)
  if (trends.length > 0) {
    const last = trends[trends.length - 1];
    if ((last.returned || 0) > 0 && (last.submitted || 0) > 0) {
      const ratio = Math.round(((last.returned || 0) / (last.submitted || 1)) * 100);
      if (ratio >= 20) {
        out.push({
          type: 'warning',
          title: `High return rate (${ratio}%) in ${last.month}`,
          body: `${last.returned} of ${last.submitted} submissions were returned — review data-quality guidance.`,
        });
      }
    }
  }

  return out;
};

const InsightCallouts = ({ lgas = [], trends = [] }) => {
  const insights = useMemo(() => buildInsights(lgas, trends), [lgas, trends]);

  if (insights.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Info className="w-4 h-4 text-neutral-500" />
        <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">Insights</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {insights.map((ins, idx) => {
          const s = STYLES[ins.type] || STYLES.info;
          const Icon = s.icon;
          return (
            <div key={idx} className={`flex items-start gap-3 p-4 rounded-xl border ${s.wrap}`}>
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${s.icon_c}`} />
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${s.title}`}>{ins.title}</p>
                <p className={`text-xs mt-0.5 leading-relaxed ${s.body}`}>{ins.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InsightCallouts;
