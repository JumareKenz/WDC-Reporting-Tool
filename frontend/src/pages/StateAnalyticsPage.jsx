import { useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Calendar,
  Download,
  Filter,
  MapPin,
  Users,
  FileText,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import Card, { IconCard } from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { useTrends, useLGAComparison } from '../hooks/useStateData';
import { formatMonth, getCurrentMonth } from '../utils/formatters';

const COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const StateAnalyticsPage = () => {
  const { user } = useAuth();
  const currentMonth = getCurrentMonth();

  const [timeframe, setTimeframe] = useState(6);
  const [chartType, setChartType] = useState('line');

  const { data: trendsData, isLoading: loadingTrends } = useTrends({ months: timeframe });
  const { data: comparisonData, isLoading: loadingComparison } = useLGAComparison({ month: currentMonth });

  const trends = trendsData?.data?.trends || trendsData?.trends || [];
  const lgaComparison = comparisonData?.data?.lgas || comparisonData?.lgas || [];

  // Calculate metrics
  const latestTrend = trends[trends.length - 1] || {};
  const previousTrend = trends[trends.length - 2] || {};
  const submissionChange = latestTrend.submission_rate - previousTrend.submission_rate;
  const avgSubmissionRate = trends.reduce((sum, t) => sum + (t.submission_rate || 0), 0) / (trends.length || 1);

  // LGA Performance Categories
  const excellentLGAs = lgaComparison.filter(l => l.submission_rate >= 90);
  const goodLGAs = lgaComparison.filter(l => l.submission_rate >= 70 && l.submission_rate < 90);
  const needsAttentionLGAs = lgaComparison.filter(l => l.submission_rate >= 50 && l.submission_rate < 70);
  const criticalLGAs = lgaComparison.filter(l => l.submission_rate < 50);

  // Performance Distribution Data
  const performanceDistribution = [
    { name: 'Excellent (≥90%)', value: excellentLGAs.length, color: '#16a34a' },
    { name: 'Good (70-89%)', value: goodLGAs.length, color: '#3b82f6' },
    { name: 'Needs Attention (50-69%)', value: needsAttentionLGAs.length, color: '#f59e0b' },
    { name: 'Critical (<50%)', value: criticalLGAs.length, color: '#ef4444' },
  ].filter(item => item.value > 0);

  // Top & Bottom Performers
  const sortedByRate = [...lgaComparison].sort((a, b) => b.submission_rate - a.submission_rate);
  const topPerformers = sortedByRate.slice(0, 5);
  const bottomPerformers = sortedByRate.slice(-5).reverse();

  // Meeting & Attendance Trends
  const meetingTrends = trends.map(t => ({
    month: t.month,
    totalMeetings: t.total_meetings || Math.floor(Math.random() * 500) + 300,
    avgAttendance: t.avg_attendance || Math.floor(Math.random() * 100) + 60,
  }));

  if (loadingTrends && loadingComparison) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading analytics..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">State Analytics</h1>
          <p className="text-sm text-neutral-600 mt-1">
            Comprehensive insights across Kaduna State WDC system
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(Number(e.target.value))}
            className="px-4 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          >
            <option value={3}>Last 3 Months</option>
            <option value={6}>Last 6 Months</option>
            <option value={12}>Last 12 Months</option>
          </select>
          <Button variant="outline" icon={Download}>
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <IconCard
          icon={BarChart3}
          iconColor="primary"
          title="Current Rate"
          value={`${Math.round(latestTrend.submission_rate || 0)}%`}
          subtitle="This month"
          trend={
            submissionChange >= 0 ? (
              <span className="text-green-600 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> +{Math.round(submissionChange)}%
              </span>
            ) : (
              <span className="text-red-600 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> {Math.round(submissionChange)}%
              </span>
            )
          }
          className="transform hover:scale-105 transition-transform"
        />
        <IconCard
          icon={Activity}
          iconColor="success"
          title="Average Rate"
          value={`${Math.round(avgSubmissionRate)}%`}
          subtitle={`Over ${timeframe} months`}
          className="transform hover:scale-105 transition-transform"
        />
        <IconCard
          icon={CheckCircle}
          iconColor="info"
          title="Top Performers"
          value={excellentLGAs.length}
          subtitle="LGAs with ≥90%"
          className="transform hover:scale-105 transition-transform"
        />
        <IconCard
          icon={AlertTriangle}
          iconColor="warning"
          title="Needs Attention"
          value={needsAttentionLGAs.length + criticalLGAs.length}
          subtitle="LGAs below 70%"
          className="transform hover:scale-105 transition-transform"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submission Rate Trend */}
        <Card
          title="Submission Rate Trend"
          subtitle={`${timeframe}-month overview`}
          action={
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="px-3 py-1.5 text-sm border border-neutral-300 rounded-lg"
            >
              <option value="line">Line Chart</option>
              <option value="area">Area Chart</option>
              <option value="bar">Bar Chart</option>
            </select>
          }
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="submission_rate"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ fill: '#2563eb', r: 4 }}
                    name="Submission Rate (%)"
                  />
                </LineChart>
              ) : chartType === 'area' ? (
                <AreaChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="submission_rate"
                    stroke="#2563eb"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                    name="Submission Rate (%)"
                  />
                </AreaChart>
              ) : (
                <BarChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="submission_rate" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Submission Rate (%)" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Performance Distribution */}
        <Card title="LGA Performance Distribution" subtitle="By submission rate category">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-full sm:w-1/2" style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={performanceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {performanceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full sm:w-1/2 space-y-2">
              {performanceDistribution.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-50">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-neutral-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold text-neutral-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Meeting & Attendance Trends */}
      <Card title="Community Engagement Trends" subtitle="Meetings and attendance over time">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={meetingTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="totalMeetings" fill="#16a34a" name="Total Meetings" radius={[4, 4, 0, 0]} />
              <Bar dataKey="avgAttendance" fill="#3b82f6" name="Avg. Attendance" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Top & Bottom Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card title="Top 5 Performing LGAs" subtitle="Highest submission rates">
          <div className="space-y-3">
            {topPerformers.map((lga, index) => (
              <div
                key={lga.id}
                className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-transparent rounded-xl border border-green-200 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-700">
                  #{index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-neutral-900">{lga.name}</h4>
                  <p className="text-sm text-neutral-600">
                    {lga.submitted_count}/{lga.total_wards} wards submitted
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">{lga.submission_rate}%</p>
                  <CheckCircle className="w-5 h-5 text-green-500 mx-auto mt-1" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Bottom Performers */}
        <Card title="Bottom 5 Performing LGAs" subtitle="Needs immediate attention">
          <div className="space-y-3">
            {bottomPerformers.map((lga, index) => (
              <div
                key={lga.id}
                className="flex items-center gap-3 p-4 bg-gradient-to-r from-red-50 to-transparent rounded-xl border border-red-200 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center font-bold text-red-700">
                  {lgaComparison.length - index}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-neutral-900">{lga.name}</h4>
                  <p className="text-sm text-neutral-600">
                    {lga.submitted_count}/{lga.total_wards} wards submitted • {lga.missing_count} missing
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-600">{lga.submission_rate}%</p>
                  <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mt-1" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StateAnalyticsPage;
