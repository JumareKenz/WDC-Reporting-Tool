import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
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

const PIE_COLORS = ['#3b82f6', '#16a34a', '#f59e0b', '#8b5cf6'];

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
  } = reportData;

  const { health_data = {}, facility_support = {}, transportation = {}, cmpdsr = {} } = service_delivery;

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

SERVICE DELIVERY DATA
${'-'.repeat(40)}
Health Services:
  OPD Total: ${health_data.opd_total || 0}
  Routine Immunization: ${health_data.routine_immunization || 0}
  ANC Total: ${health_data.anc_total || 0}
  Deliveries: ${health_data.deliveries || 0}
  Postnatal: ${health_data.postnatal || 0}
  FP Counselling: ${health_data.fp_counselling || 0}
  HepB Tested: ${health_data.hepb_tested || 0}
  TB Presumptive: ${health_data.tb_presumptive || 0}

Facility Support:
  Facilities Renovated: ${facility_support.facilities_renovated || 0}
  Items Donated (WDC): ${facility_support.items_donated_wdc || 0}
  Items Donated (Govt): ${facility_support.items_donated_govt || 0}
  Items Repaired: ${facility_support.items_repaired || 0}

Transportation:
  Women Transported (ANC): ${transportation.women_transported_anc || 0}
  Women Transported (Delivery): ${transportation.women_transported_delivery || 0}
  Children (Emergency): ${transportation.children_transported_danger || 0}
  Delivery Items Support: ${transportation.women_supported_delivery_items || 0}

Maternal & Perinatal Deaths:
  Maternal Deaths: ${cmpdsr.maternal_deaths || 0}
  Perinatal Deaths: ${cmpdsr.perinatal_deaths || 0}

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
      ['SERVICE DELIVERY - HEALTH DATA'],
      ['OPD Total', health_data.opd_total || 0],
      ['Routine Immunization', health_data.routine_immunization || 0],
      ['ANC Total', health_data.anc_total || 0],
      ['Deliveries', health_data.deliveries || 0],
      ['Postnatal', health_data.postnatal || 0],
      ['FP Counselling', health_data.fp_counselling || 0],
      ['HepB Tested', health_data.hepb_tested || 0],
      ['TB Presumptive', health_data.tb_presumptive || 0],
      [],
      ['SERVICE DELIVERY - FACILITY SUPPORT'],
      ['Facilities Renovated', facility_support.facilities_renovated || 0],
      ['Items Donated (WDC)', facility_support.items_donated_wdc || 0],
      ['Items Donated (Govt)', facility_support.items_donated_govt || 0],
      ['Items Repaired', facility_support.items_repaired || 0],
      [],
      ['SERVICE DELIVERY - TRANSPORTATION'],
      ['Women Transported (ANC)', transportation.women_transported_anc || 0],
      ['Women Transported (Delivery)', transportation.women_transported_delivery || 0],
      ['Children (Emergency)', transportation.children_transported_danger || 0],
      ['Delivery Items Support', transportation.women_supported_delivery_items || 0],
      [],
      ['MATERNAL & PERINATAL DEATHS (cMPDSR)'],
      ['Maternal Deaths', cmpdsr.maternal_deaths || 0],
      ['Perinatal Deaths', cmpdsr.perinatal_deaths || 0],
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
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <FileText className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-green-700">{formatNumber(state_overview.reports_submitted)}</p>
              <p className="text-xs text-green-600">Submitted</p>
            </div>
            <div className="p-4 bg-neutral-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-neutral-700">{state_overview.submission_rate}%</p>
              <p className="text-xs text-neutral-600">Submission Rate</p>
            </div>
            <div className={`p-4 rounded-lg text-center ${state_overview.rate_change >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              {state_overview.rate_change >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600 mx-auto mb-1" />
              )}
              <p className={`text-2xl font-bold ${state_overview.rate_change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {state_overview.rate_change > 0 ? '+' : ''}{state_overview.rate_change}%
              </p>
              <p className="text-xs text-neutral-600">vs Previous Month</p>
            </div>
          </div>
        </section>

        {/* 2. Service Delivery Charts */}
        <section>
          <h3 className="text-lg font-bold text-neutral-900 mb-4 border-b pb-2">Service Delivery Charts</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Immunization Breakdown */}
            <div className="p-4 bg-white border rounded-xl">
              <h4 className="font-semibold text-sm text-neutral-700 mb-3">Immunization Breakdown</h4>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.immunization || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ANC Cascade */}
            <div className="p-4 bg-white border rounded-xl">
              <h4 className="font-semibold text-sm text-neutral-700 mb-3">ANC Cascade</h4>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.anc_cascade || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#16a34a" radius={[4, 4, 0, 0]} name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Transportation Breakdown */}
            <div className="p-4 bg-white border rounded-xl">
              <h4 className="font-semibold text-sm text-neutral-700 mb-3">Transportation Breakdown</h4>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={(charts.transportation || []).filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {(charts.transportation || []).filter(d => d.value > 0).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Facility Support */}
            <div className="p-4 bg-white border rounded-xl">
              <h4 className="font-semibold text-sm text-neutral-700 mb-3">Facility Support</h4>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.facility_support || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Key Issues & Challenges */}
        <section>
          <h3 className="text-lg font-bold text-neutral-900 mb-4 border-b pb-2">Key Issues & Challenges</h3>
          {key_issues.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {key_issues.map((issue, idx) => (
                <div key={idx} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                  <p className="font-semibold text-yellow-800 capitalize">{issue.word}</p>
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
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-green-600 text-white rounded flex items-center justify-center text-xs font-bold">S</span>
                Strengths
              </h4>
              <ul className="space-y-1.5">
                {(swot.strengths || []).map((item, idx) => (
                  <li key={idx} className="text-sm text-green-800 flex items-start gap-1.5">
                    <span className="text-green-500 mt-0.5">+</span>
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
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <h4 className="font-bold text-yellow-800 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-yellow-600 text-white rounded flex items-center justify-center text-xs font-bold">T</span>
                Threats
              </h4>
              <ul className="space-y-1.5">
                {(swot.threats || []).map((item, idx) => (
                  <li key={idx} className="text-sm text-yellow-800 flex items-start gap-1.5">
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
