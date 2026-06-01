import React, { useMemo, useState } from 'react';
import { Activity, ArrowUpDown } from 'lucide-react';
import Card, { EmptyCard } from '../common/Card';
import { formatNumber } from '../../utils/formatters';

/**
 * ServiceDeliveryMetrics
 * Data-driven service-delivery table. Consumes the backend
 * /analytics/service-delivery array: [{ category, total_reports, avg_value,
 * min_value, max_value }]. `category` is the user-defined form field key, so the
 * set of rows reflects whatever the active form schema defines — nothing here is
 * hardcoded to specific health/facility fields.
 *
 * Props:
 *  - metrics: Array<{ category, total_reports, avg_value, min_value, max_value }>
 *  - loading: boolean
 */

// Humanize a snake_case field key → "Anc Visits" → "ANC Visits"-ish title case.
const humanize = (key = '') =>
  String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(Anc|Opd|Tb|Hiv|Fp|Wdc|Lga|Cmpdsr)\b/gi, (m) => m.toUpperCase())
    .trim();

const fmt = (v) =>
  v === null || v === undefined ? '—' : formatNumber(Number.isInteger(v) ? v : Math.round(v * 10) / 10);

const SORTS = {
  category: (a, b) => a.category.localeCompare(b.category),
  avg: (a, b) => (b.avg_value ?? 0) - (a.avg_value ?? 0),
  reports: (a, b) => (b.total_reports ?? 0) - (a.total_reports ?? 0),
};

const ServiceDeliveryMetrics = ({ metrics = [], loading = false }) => {
  const [sortBy, setSortBy] = useState('reports');

  const sorted = useMemo(
    () => [...metrics].sort(SORTS[sortBy] || SORTS.reports),
    [metrics, sortBy]
  );

  return (
    <Card
      title="Service Delivery Metrics"
      subtitle="Aggregated from approved & sealed reports"
      action={
        <div className="flex items-center gap-1.5 text-xs">
          <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2 py-1 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="reports">Most reported</option>
            <option value="avg">Highest average</option>
            <option value="category">A–Z</option>
          </select>
        </div>
      }
    >
      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 bg-neutral-100 rounded" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyCard
          icon={Activity}
          title="No service-delivery data"
          description="Metrics appear once reports with numeric fields are approved."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600">
                <th className="text-left py-2.5 px-3 font-semibold">Metric</th>
                <th className="text-center py-2.5 px-3 font-semibold">Reports</th>
                <th className="text-center py-2.5 px-3 font-semibold">Average</th>
                <th className="text-center py-2.5 px-3 font-semibold">Min</th>
                <th className="text-center py-2.5 px-3 font-semibold">Max</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((m) => (
                <tr key={m.category} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="py-2.5 px-3 font-medium text-neutral-800">{humanize(m.category)}</td>
                  <td className="py-2.5 px-3 text-center text-neutral-600">{fmt(m.total_reports)}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-primary-50 text-primary-700 font-semibold">
                      {fmt(m.avg_value)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-neutral-500">{fmt(m.min_value)}</td>
                  <td className="py-2.5 px-3 text-center text-neutral-500">{fmt(m.max_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

export default ServiceDeliveryMetrics;
