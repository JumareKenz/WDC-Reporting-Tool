import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Copy,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Building,
  MapPin,
  FileText,
  AlertTriangle,
  Download,
} from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { formatNumber, formatMonth, formatDate } from '../../utils/formatters';
import generateReportPDF from '../../utils/generateReportPDF';

const MonthlyReportModal = ({ isOpen, onClose, reportData, month }) => {
  const [copied, setCopied] = useState(false);

  if (!reportData) return null;

  const {
    state_overview = {},
    service_delivery = {},
    key_issues = [],
    recommendations = [],
    charts = {},
    swot = {},
    ai_narrative,
    executive_summary,
  } = reportData;

  // Service delivery is now a flat metrics array: { category, total_reports,
  // avg_value, min_value, max_value }. `category` = user-defined form field key.
  const sdMetrics = service_delivery.metrics || charts.service_metrics || [];
  const humanize = (k = '') =>
    String(k).replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
  const sdChartData = sdMetrics
    .map((m) => ({ name: humanize(m.category), value: Math.round((m.avg_value ?? 0) * 10) / 10 }))
    .filter((d) => d.value > 0)
    .slice(0, 12);

  const handleCopyToClipboard = () => {
    const text = `
KADUNA STATE WDC COMPREHENSIVE MONTHLY REPORT - ${formatMonth(month)}
${'='.repeat(60)}

STATE OVERVIEW
${'-'.repeat(40)}
Total LGAs: ${state_overview.total_lgas}
Total Wards: ${state_overview.total_wards}
Reports Submitted: ${state_overview.reports_submitted}
Reports Missing: ${state_overview.reports_missing}
Submission Rate: ${state_overview.submission_rate}%
Previous Month Rate: ${state_overview.prev_rate}%
Rate Change: ${state_overview.rate_change > 0 ? '+' : ''}${state_overview.rate_change}%

SERVICE DELIVERY METRICS (avg per report)
${'-'.repeat(40)}
${sdMetrics.length > 0
  ? sdMetrics.map((m) => `  ${humanize(m.category)}: avg ${m.avg_value ?? '—'} (min ${m.min_value ?? '—'}, max ${m.max_value ?? '—'}, ${m.total_reports ?? 0} reports)`).join('\n')
  : '  No service-delivery data'}

KEY ISSUES & CHALLENGES
${'-'.repeat(40)}
${key_issues.length > 0 ? key_issues.map((i, idx) => `${idx + 1}. "${i.word}" (mentioned ${i.count} times)`).join('\n') : 'No issues reported'}

RECOMMENDATIONS
${'-'.repeat(40)}
${recommendations.length > 0 ? recommendations.map((r, idx) => `${idx + 1}. ${r}`).join('\n') : 'No recommendations available'}

SWOT ANALYSIS
${'-'.repeat(40)}
Strengths:
${(swot.strengths || []).map(s => `  + ${s}`).join('\n')}

Weaknesses:
${(swot.weaknesses || []).map(w => `  - ${w}`).join('\n')}

Opportunities:
${(swot.opportunities || []).map(o => `  * ${o}`).join('\n')}

Threats:
${(swot.threats || []).map(t => `  ! ${t}`).join('\n')}

LGA PERFORMANCE
${'-'.repeat(40)}
${(charts.lga_rates || []).map(l => `${l.name}: ${l.rate}% (${l.submitted}/${l.total})`).join('\n')}

${'='.repeat(60)}
Generated on: ${formatDate(new Date(), true)}
Kaduna State WDC Digital Reporting System
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    generateReportPDF(reportData, month);
  };

  const handleExportCSV = () => {
    const rows = [
      ['KADUNA STATE WDC AI MONTHLY REPORT', formatMonth(month)],
      [],
      ['STATE OVERVIEW'],
      ['Total LGAs', state_overview.total_lgas],
      ['Total Wards', state_overview.total_wards],
      ['Reports Submitted', state_overview.reports_submitted],
      ['Reports Missing', state_overview.reports_missing],
      ['Submission Rate (%)', state_overview.submission_rate],
      ['Previous Month Rate (%)', state_overview.prev_rate],
      ['Rate Change (%)', state_overview.rate_change],
      [],
      ['SERVICE DELIVERY METRICS'],
      ['Metric', 'Reports', 'Average', 'Min', 'Max'],
      ...(sdMetrics.length > 0
        ? sdMetrics.map((m) => [humanize(m.category), m.total_reports ?? 0, m.avg_value ?? '', m.min_value ?? '', m.max_value ?? ''])
        : [['No service-delivery data', '', '', '', '']]),
      [],
      ['KEY ISSUES & CHALLENGES'],
      ...(key_issues.length > 0 ? key_issues.map((issue, i) => [`${i + 1}. ${issue.word}`, issue.count]) : [['No issues reported', '']]),
      [],
      ['RECOMMENDATIONS'],
      ...(recommendations.length > 0 ? recommendations.map((rec, i) => [`${i + 1}.`, rec]) : [['No recommendations available', '']]),
      [],
      ['LGA PERFORMANCE'],
      ['LGA Name', 'Submission Rate (%)', 'Submitted', 'Total Wards'],
      ...(charts.lga_rates || []).map(l => [l.name, l.rate, l.submitted, l.total]),
      [],
      ['SWOT ANALYSIS - STRENGTHS'],
      ...(swot.strengths || []).map(s => ['', s]),
      [],
      ['SWOT ANALYSIS - WEAKNESSES'],
      ...(swot.weaknesses || []).map(w => ['', w]),
      [],
      ['SWOT ANALYSIS - OPPORTUNITIES'],
      ...(swot.opportunities || []).map(o => ['', o]),
      [],
      ['SWOT ANALYSIS - THREATS'],
      ...(swot.threats || []).map(t => ['', t]),
      [],
      ['Generated on:', formatDate(new Date(), true)],
      ['Kaduna State WDC Digital Reporting System'],
    ];

    const csvContent = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Kaduna_WDC_AI_Report_${month}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`AI Monthly Report - ${formatMonth(month)}`}
      size="full"
    >
      <div className="space-y-8 max-h-[75vh] overflow-y-auto pr-2">
        {/* Action Buttons */}
        <div className="flex justify-end gap-2 sticky top-0 bg-white z-10 pb-2">
          <Button
            variant="primary"
            icon={Download}
            onClick={handleDownloadPDF}
          >
            Download PDF
          </Button>
          <Button
            variant="outline"
            icon={Download}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            icon={copied ? CheckCircle : Copy}
            onClick={handleCopyToClipboard}
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </Button>
        </div>

        {/* 0. Executive Summary / AI Narrative */}
        {(ai_narrative || executive_summary) && (
          <section>
            <h3 className="text-lg font-bold text-neutral-900 mb-4 border-b pb-2">Executive Summary</h3>
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
                {ai_narrative || executive_summary}
              </p>
            </div>
          </section>
        )}

        {/* 1. State Overview */}
        <section>
          <h3 className="text-lg font-bold text-neutral-900 mb-4 border-b pb-2">State Overview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="p-4 bg-primary-50 rounded-lg text-center">
              <Building className="w-5 h-5 text-primary-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-primary-700">{state_overview.total_lgas}</p>
              <p className="text-xs text-primary-600">Total LGAs</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <MapPin className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-blue-700">{formatNumber(state_overview.total_wards)}</p>
              <p className="text-xs text-blue-600">Total Wards</p>
            </div>
            <div className="p-4 bg-primary-50 rounded-lg text-center">
              <FileText className="w-5 h-5 text-primary-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-primary-700">{formatNumber(state_overview.reports_submitted)}</p>
              <p className="text-xs text-primary-600">Submitted</p>
            </div>
            <div className="p-4 bg-neutral-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-neutral-700">{state_overview.submission_rate}%</p>
              <p className="text-xs text-neutral-600">Submission Rate</p>
            </div>
            <div className={`p-4 rounded-lg text-center ${state_overview.rate_change >= 0 ? 'bg-primary-50' : 'bg-red-50'}`}>
              {state_overview.rate_change >= 0 ? (
                <TrendingUp className="w-5 h-5 text-primary-600 mx-auto mb-1" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600 mx-auto mb-1" />
              )}
              <p className={`text-2xl font-bold ${state_overview.rate_change >= 0 ? 'text-primary-700' : 'text-red-700'}`}>
                {state_overview.rate_change > 0 ? '+' : ''}{state_overview.rate_change}%
              </p>
              <p className="text-xs text-neutral-600">vs Previous Month</p>
            </div>
          </div>
        </section>

        {/* 2. Service Delivery Metrics */}
        <section>
          <h3 className="text-lg font-bold text-neutral-900 mb-4 border-b pb-2">Service Delivery Metrics</h3>
          {sdChartData.length > 0 ? (
            <div className="p-4 bg-white border rounded-xl">
              <h4 className="font-semibold text-sm text-neutral-700 mb-3">Average value per report (top {sdChartData.length})</h4>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sdChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2f6b4d" radius={[0, 4, 4, 0]} name="Average" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="text-neutral-500 text-sm">No service-delivery metrics for this period.</p>
          )}
        </section>

        {/* 3. Key Issues & Challenges */}
        <section>
          <h3 className="text-lg font-bold text-neutral-900 mb-4 border-b pb-2">Key Issues & Challenges</h3>
          {key_issues.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {key_issues.map((issue, idx) => (
                <div key={idx} className="p-3 bg-accent-50 border border-yellow-200 rounded-lg text-center">
                  <p className="font-semibold text-accent-900 capitalize">{issue.word}</p>
                  <p className="text-xs text-yellow-600">{issue.count} mentions</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-500 text-sm">No issues reported for this period.</p>
          )}
        </section>

        {/* 4. Recommendations */}
        <section>
          <h3 className="text-lg font-bold text-neutral-900 mb-4 border-b pb-2">Recommendations</h3>
          {recommendations.length > 0 ? (
            <ul className="space-y-2">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="mt-1 w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-neutral-700">{rec}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-neutral-500 text-sm">No recommendations available.</p>
          )}
        </section>

        {/* 5. SWOT Analysis */}
        <section>
          <h3 className="text-lg font-bold text-neutral-900 mb-4 border-b pb-2">SWOT Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            <div className="p-4 bg-primary-50 border border-primary-200 rounded-xl">
              <h4 className="font-bold text-primary-800 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-primary-600 text-white rounded flex items-center justify-center text-xs font-bold">S</span>
                Strengths
              </h4>
              <ul className="space-y-1.5">
                {(swot.strengths || []).map((item, idx) => (
                  <li key={idx} className="text-sm text-primary-800 flex items-start gap-1.5">
                    <span className="text-primary-500 mt-0.5">+</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <h4 className="font-bold text-red-800 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-red-600 text-white rounded flex items-center justify-center text-xs font-bold">W</span>
                Weaknesses
              </h4>
              <ul className="space-y-1.5">
                {(swot.weaknesses || []).map((item, idx) => (
                  <li key={idx} className="text-sm text-red-800 flex items-start gap-1.5">
                    <span className="text-red-500 mt-0.5">-</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Opportunities */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded flex items-center justify-center text-xs font-bold">O</span>
                Opportunities
              </h4>
              <ul className="space-y-1.5">
                {(swot.opportunities || []).map((item, idx) => (
                  <li key={idx} className="text-sm text-blue-800 flex items-start gap-1.5">
                    <span className="text-blue-500 mt-0.5">*</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Threats */}
            <div className="p-4 bg-accent-50 border border-yellow-200 rounded-xl">
              <h4 className="font-bold text-accent-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-yellow-600 text-white rounded flex items-center justify-center text-xs font-bold">T</span>
                Threats
              </h4>
              <ul className="space-y-1.5">
                {(swot.threats || []).map((item, idx) => (
                  <li key={idx} className="text-sm text-accent-900 flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-yellow-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 6. LGA Performance */}
        <section>
          <h3 className="text-lg font-bold text-neutral-900 mb-4 border-b pb-2">LGA Performance</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.lga_rates || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => [`${value}%`, 'Submission Rate']} />
                <Bar dataKey="rate" name="Submission Rate" radius={[0, 4, 4, 0]}>
                  {(charts.lga_rates || []).map((entry, index) => (
                    <Cell
                      key={`lga-${index}`}
                      fill={
                        entry.rate >= 90 ? '#16a34a' :
                        entry.rate >= 70 ? '#3b82f6' :
                        entry.rate >= 50 ? '#f59e0b' : '#ef4444'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </Modal>
  );
};

export default MonthlyReportModal;
