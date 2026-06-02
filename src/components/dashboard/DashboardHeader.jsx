import React from 'react';
import { RefreshCw, Download, Sparkles, Bot } from 'lucide-react';
import { PERIOD_MODES, getRelativeTime } from './dashboardUtils';

/**
 * Sticky page header (56px content row). Left: title + period subtitle.
 * Right: period selector, refresh + last-updated, Download Overview, AI Report,
 * AI Assistant. All actions are driven by props so the page owns the logic.
 */

const SEGMENTS = [
  { mode: PERIOD_MODES.THIS, label: 'This Month' },
  { mode: PERIOD_MODES.LAST, label: 'Last Month' },
  { mode: PERIOD_MODES.CUSTOM, label: 'Custom' },
  { mode: PERIOD_MODES.ALL, label: 'All Time' },
];

const PeriodSelector = ({ period, customMonth, onChangeMode, onChangeCustomMonth }) => {
  const now = new Date();
  const maxMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5">
        {SEGMENTS.map(({ mode, label }) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChangeMode(mode)}
            className={`rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors ${
              period.mode === mode
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {period.mode === PERIOD_MODES.CUSTOM && (
        <input
          type="month"
          value={customMonth || maxMonth}
          max={maxMonth}
          onChange={(e) => onChangeCustomMonth(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-[13px] text-neutral-700 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          aria-label="Select custom month"
        />
      )}
    </div>
  );
};

const DashboardHeader = ({
  period,
  customMonth,
  onChangeMode,
  onChangeCustomMonth,
  lastUpdated,
  isRefreshing,
  onRefresh,
  onExport,
  onGenerateReport,
  onOpenAIChat,
  canDownload = true,
}) => (
  <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
    <div className="mx-auto flex min-h-[56px] max-w-screen-2xl flex-col gap-3 px-4 py-2 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:py-0">
      {/* Title block */}
      <div className="min-w-0">
        <h1 className="text-[20px] font-semibold leading-tight text-neutral-900">Dashboard</h1>
        <p className="truncate text-[13px] text-neutral-500">
          {period.label} · Reporting Period
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <PeriodSelector
          period={period}
          customMonth={customMonth}
          onChangeMode={onChangeMode}
          onChangeCustomMonth={onChangeCustomMonth}
        />

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-60"
          title="Refresh dashboard data"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">
            {isRefreshing ? 'Updating…' : lastUpdated ? `Updated ${getRelativeTime(lastUpdated)}` : 'Refresh'}
          </span>
        </button>

        {canDownload && (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
            title="Download dashboard overview (CSV)"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Download Overview</span>
          </button>
        )}

        <button
          type="button"
          onClick={onGenerateReport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary-600 px-2.5 py-1.5 text-[13px] font-medium text-primary-700 transition-colors hover:bg-primary-50"
          title="Generate AI monthly report"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">AI Report</span>
        </button>

        <button
          type="button"
          onClick={onOpenAIChat}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-2.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-primary-700"
          title="Ask the AI assistant"
        >
          <Bot className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">AI Assistant</span>
        </button>
      </div>
    </div>
  </header>
);

export default DashboardHeader;
