import React from 'react';
import { FileText, AlertTriangle, ArrowRight, Activity } from 'lucide-react';
import Panel from './Panel';
import { getRelativeTime } from './dashboardUtils';
import { ListSkeleton, SectionError, EmptyState } from './Skeletons';
import { formatMonth } from '../../utils/formatters';

/**
 * Recent Activity — chronological feed of the latest submission events.
 * Read-only. `items` are pre-flattened by the page:
 *   { id, ward_name, lga_name, report_month, submitted_at, state }
 */
const RecentActivity = ({ items = [], loading, error, onViewAll, onRetry }) => {
  let body;
  if (loading) body = <ListSkeleton rows={6} />;
  else if (error) body = <SectionError message="Could not load recent activity." onRetry={onRetry} />;
  else if (items.length === 0) {
    body = <EmptyState icon={Activity} title="No recent activity" description="Submissions for this period will appear here as they arrive." />;
  } else {
    body = (
      <ul className="divide-y divide-neutral-100">
        {items.map((it) => {
          const flagged = it.state === 'returned';
          return (
            <li key={it.id} className="flex items-center gap-3 py-2">
              <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${flagged ? 'bg-amber-50' : 'bg-neutral-100'}`}>
                {flagged ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> : <FileText className="h-3.5 w-3.5 text-neutral-400" />}
              </span>
              <p className="min-w-0 flex-1 truncate text-[13px] text-neutral-700">
                <span className="font-medium text-neutral-900">{it.ward_name}</span>
                {it.lga_name ? <span className="text-neutral-400">, {it.lga_name}</span> : null}
                {' '}submitted their {it.report_month ? formatMonth(it.report_month) : ''} report
              </p>
              <span className="flex-shrink-0 text-[12px] text-neutral-400">{getRelativeTime(it.submitted_at)}</span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <Panel
      title="Recent Activity"
      action={onViewAll && items.length > 0 ? (
        <button type="button" onClick={onViewAll} className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-600 hover:text-primary-800">
          View all <ArrowRight className="h-3 w-3" />
        </button>
      ) : null}
    >
      {body}
    </Panel>
  );
};

export default RecentActivity;
