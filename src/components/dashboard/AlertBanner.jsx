import React from 'react';
import { AlertTriangle, AlertCircle, ArrowRight } from 'lucide-react';

/**
 * Conditional alert banner. Renders nothing when there is no issue (no empty
 * space). Severity:
 *   RED   — one or more LGAs have 0 submissions in the period.
 *   AMBER — state coverage is below the 60% target.
 * Red takes precedence over amber. All thresholds are computed from real data.
 */
const AlertBanner = ({ lgas = [], submissionRate, period, onViewDetails }) => {
  const zeroLgas = lgas.filter((l) => (l.submitted_count ?? 0) === 0);
  const atRisk = lgas.filter((l) => (l.submission_rate ?? 0) < 60);
  const periodWord = period?.month ? (period.isPast ? 'this period' : 'so far this month') : 'all-time';

  let config = null;
  if (zeroLgas.length > 0) {
    config = {
      tone: 'red',
      Icon: AlertTriangle,
      wrap: 'border-red-200 bg-red-50',
      iconCls: 'text-red-500',
      textCls: 'text-red-800',
      linkCls: 'text-red-700 hover:text-red-900',
      message: `${zeroLgas.length} LGA${zeroLgas.length > 1 ? 's have' : ' has'} not submitted any reports ${periodWord}.`,
    };
  } else if (submissionRate !== null && submissionRate !== undefined && submissionRate < 60) {
    config = {
      tone: 'amber',
      Icon: AlertCircle,
      wrap: 'border-amber-200 bg-amber-50',
      iconCls: 'text-amber-500',
      textCls: 'text-amber-800',
      linkCls: 'text-amber-700 hover:text-amber-900',
      message: `Submission coverage is below target (${Math.round(submissionRate)}%).${
        atRisk.length ? ` ${atRisk.length} LGA${atRisk.length > 1 ? 's are' : ' is'} at risk.` : ''
      }`,
    };
  }

  if (!config) return null;
  const { Icon } = config;

  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 ${config.wrap}`} role="alert">
      <Icon className={`h-4 w-4 flex-shrink-0 ${config.iconCls}`} />
      <p className={`flex-1 text-[13px] font-medium ${config.textCls}`}>{config.message}</p>
      {onViewDetails && (
        <button
          type="button"
          onClick={onViewDetails}
          className={`inline-flex flex-shrink-0 items-center gap-1 text-[13px] font-semibold ${config.linkCls}`}
        >
          View details <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

export default AlertBanner;
