import React, { useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, Search, Building2 } from 'lucide-react';
import Panel from './Panel';
import GenerateReportButton from '../state/GenerateReportButton';
import { rateTone, lgaStatus, formatRatio, formatPct, getRelativeTime } from './dashboardUtils';
import { TableSkeleton, SectionError, EmptyState } from './Skeletons';

/**
 * LGA Breakdown table. Default sort: submission rate ascending (worst first).
 * Rows are tinted by status; the AI Report column reuses the real
 * GenerateReportButton (scope='lga'), disabled until a specific month is chosen.
 */
const SORT_VALUE = {
  name: (l) => String(l.name || '').toLowerCase(),
  wards: (l) => l.total_wards ?? 0,
  rate: (l) => l.submission_rate ?? 0,
  last: (l) => (l.last_report_at ? new Date(l.last_report_at).getTime() : 0),
};

const SortHeader = ({ field, label, sort, onSort, align = 'left' }) => {
  const active = sort.field === field;
  const Icon = sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={`px-3 py-2 text-${align}`}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.05em] ${active ? 'text-neutral-800' : 'text-neutral-400 hover:text-neutral-600'}`}
      >
        {label}
        {active && <Icon className="h-3 w-3" />}
      </button>
    </th>
  );
};

const LgaTable = ({ lgas = [], period, loading, error, onOpenLga, onRetry }) => {
  const [sort, setSort] = useState({ field: 'rate', dir: 'asc' });
  const [query, setQuery] = useState('');

  const reportingCount = lgas.filter((l) => (l.submitted_count ?? 0) > 0).length;
  const showSearch = lgas.length > 20;

  const rows = useMemo(() => {
    const get = SORT_VALUE[sort.field] || SORT_VALUE.rate;
    return [...lgas]
      .filter((l) => String(l.name || '').toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => {
        const av = get(a);
        const bv = get(b);
        if (av < bv) return sort.dir === 'asc' ? -1 : 1;
        if (av > bv) return sort.dir === 'asc' ? 1 : -1;
        return 0;
      });
  }, [lgas, sort, query]);

  const onSort = (field) =>
    setSort((s) => (s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' }));

  let body;
  if (loading) body = <TableSkeleton rows={8} />;
  else if (error) body = <SectionError message="Could not load the LGA breakdown." onRetry={onRetry} />;
  else if (lgas.length === 0) body = <EmptyState icon={Building2} title="No LGA data" description="The breakdown appears once LGA data is available for this period." />;
  else {
    body = (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-neutral-200">
              <SortHeader field="name" label="LGA" sort={sort} onSort={onSort} />
              <SortHeader field="wards" label="Wards" sort={sort} onSort={onSort} align="right" />
              <SortHeader field="rate" label="Rate" sort={sort} onSort={onSort} align="right" />
              <th className="px-3 py-2 text-center text-[11px] font-medium uppercase tracking-[0.05em] text-neutral-400">Status</th>
              <th className="px-3 py-2 text-center text-[11px] font-medium uppercase tracking-[0.05em] text-neutral-400">AI Report</th>
              <SortHeader field="last" label="Last Submission" sort={sort} onSort={onSort} align="right" />
            </tr>
          </thead>
          <tbody>
            {rows.map((lga) => {
              const status = lgaStatus(lga, period);
              const tone = rateTone(lga.submission_rate);
              return (
                <tr key={lga.id ?? lga.name} className={`border-b border-neutral-100 ${status.tone.row} hover:bg-neutral-50`}>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onOpenLga?.(lga)}
                      className="truncate text-left text-[13px] font-semibold text-neutral-900 hover:text-primary-700 hover:underline"
                      title={lga.name}
                    >
                      {lga.name}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-[13px] tabular-nums text-neutral-700">
                    {formatRatio(lga.submitted_count, lga.total_wards)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${tone.badge}`}>
                      {formatPct(lga.submission_rate)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${status.tone.badge}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex justify-center">
                      <GenerateReportButton
                        scope="lga"
                        month={period?.month || ''}
                        lgaId={lga.id ?? lga.lgaId}
                        size="sm"
                        label="Generate"
                        disabled={!period?.month}
                        disabledTooltip="Select a specific month to generate a report"
                        filenameBase={`Kaduna_${String(lga.name || 'LGA').replace(/\s+/g, '_')}_Report_${period?.month || ''}`}
                      />
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-[13px] text-neutral-500">
                    {lga.last_report_at ? getRelativeTime(lga.last_report_at) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="py-6 text-center text-[13px] text-neutral-500">No LGAs match “{query}”.</p>
        )}
      </div>
    );
  }

  return (
    <Panel
      title="LGA Breakdown"
      subtitle={loading ? '' : `${reportingCount} of ${lgas.length} LGAs reporting`}
      action={showSearch && !loading && !error ? (
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter LGAs…"
            className="w-44 rounded-lg border border-neutral-200 py-1.5 pl-8 pr-2 text-[13px] outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
        </div>
      ) : null}
      bodyClassName="p-0"
    >
      <div className={body && lgas.length > 0 && !loading && !error ? '' : 'p-4'}>{body}</div>
    </Panel>
  );
};

export default LgaTable;
