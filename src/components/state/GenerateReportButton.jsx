import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Loader2, Download, ChevronDown, FileText, FileType, AlertCircle } from 'lucide-react';
import {
  generateIntelligenceReport,
  getIntelligenceReportStatus,
  downloadIntelligenceReport,
} from '../../api/intelligenceReports';
import { useAuth } from '../../hooks/useAuth';

const POLL_INTERVAL_MS = 4000;

/**
 * "Generate Report" control for the Submissions page (state- or LGA-scoped).
 *
 * Kicks off a director-only, job-based AI intelligence report, polls until the
 * backend job completes, then offers branded PDF / Word downloads via an inline
 * dropdown. Each rendered instance owns its state, so a state report and any
 * number of per-LGA reports generate independently and concurrently.
 *
 * Results are cached in-session per (scope + month + lgaId); jobIds persist 7
 * days server-side, so re-selecting a month shows download options immediately
 * without regenerating.
 *
 * @param {'state'|'lga'} [scope='state'] - Report scope.
 * @param {string} month - Selected reporting month in "YYYY-MM" format.
 * @param {string} [lgaId] - LGA id; required when scope === 'lga'.
 * @param {boolean} [disabled] - True when there is nothing to analyse.
 * @param {'sm'|'md'} [size='md'] - Compact ('sm') for LGA rows; 'md' for the header.
 * @param {string} [label] - Button label override.
 * @param {string} [disabledTooltip] - Tooltip text when disabled.
 * @param {string} [filenameBase] - Download filename (without extension).
 */
const GenerateReportButton = ({
  scope = 'state',
  month,
  lgaId,
  disabled = false,
  size = 'md',
  label,
  disabledTooltip,
  filenameBase,
}) => {
  const isLga = scope === 'lga';
  const cacheKey = isLga ? `${month}:${lgaId}` : month;

  // Per-key job cache: { [cacheKey]: { status, jobId, metadata, error } }
  // status: 'idle' | 'generating' | 'ready' | 'error'
  const [jobs, setJobs] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [downloading, setDownloading] = useState(null); // 'pdf' | 'docx' | null
  const pollTimers = useRef({}); // cacheKey -> timeout id
  const mounted = useRef(true);
  const menuRef = useRef(null);
  const { isDirector } = useAuth();

  const current = jobs[cacheKey] || { status: 'idle' };

  // Resolved labels/copy/filenames.
  const btnLabel = label || (isLga ? 'Generate LGA Report' : 'Generate State Report');
  const tooltip = disabledTooltip || (isLga ? 'No ward submissions for this LGA' : 'No submissions to analyse');
  const fileBase = filenameBase || (isLga
    ? `Kaduna_LGA_Intelligence_Report_${month}`
    : `Kaduna_State_Intelligence_Report_${month}`);

  // Size-dependent styling.
  const sizeCls = size === 'sm' ? 'px-2.5 py-1 text-xs gap-1.5' : 'px-3 py-1.5 text-sm gap-2';
  const iconCls = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const baseBtn = `inline-flex items-center font-medium rounded-lg border-2 transition-colors ${sizeCls}`;

  const setKeyJob = useCallback((key, patch) => {
    setJobs((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }, []);

  // Cleanup pending poll timers on unmount.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      Object.values(pollTimers.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  // Close the download dropdown when the cache key changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [cacheKey]);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const pollStatus = useCallback((key, jobId) => {
    const tick = async () => {
      if (!mounted.current) return;
      try {
        const res = await getIntelligenceReportStatus(jobId);
        if (!mounted.current) return;
        const status = res?.status;
        if (status === 'completed') {
          setKeyJob(key, {
            status: 'ready',
            jobId,
            metadata: res?.result?.metadata || null,
            error: null,
          });
        } else if (status === 'failed') {
          setKeyJob(key, {
            status: 'error',
            error: res?.error || 'Report generation failed. Please try again.',
          });
        } else {
          // pending / processing — keep polling
          pollTimers.current[key] = setTimeout(tick, POLL_INTERVAL_MS);
        }
      } catch (err) {
        if (!mounted.current) return;
        setKeyJob(key, {
          status: 'error',
          error: err?.userMessage || err?.message || 'Could not reach the report service.',
        });
      }
    };
    pollTimers.current[key] = setTimeout(tick, POLL_INTERVAL_MS);
  }, [setKeyJob]);

  const handleGenerate = useCallback(async () => {
    const key = cacheKey;
    const [yStr, mStr] = month.split('-');
    const year = Number(yStr);
    const monthNum = Number(mStr); // 1-indexed, as the backend expects

    setKeyJob(key, { status: 'generating', error: null });
    try {
      const res = await generateIntelligenceReport({ month: monthNum, year, scope, lgaId });
      const jobId = res?.jobId;
      if (!jobId) throw new Error('No job was created. Please try again.');
      setKeyJob(key, { status: 'generating', jobId });
      pollStatus(key, jobId);
    } catch (err) {
      setKeyJob(key, {
        status: 'error',
        error: err?.userMessage || err?.message || 'Failed to start report generation.',
      });
    }
  }, [cacheKey, month, scope, lgaId, setKeyJob, pollStatus]);

  const handleDownload = useCallback(async (format) => {
    if (!current.jobId) return;
    setMenuOpen(false);
    setDownloading(format);
    try {
      await downloadIntelligenceReport(current.jobId, format, fileBase);
    } catch (err) {
      setKeyJob(cacheKey, {
        status: 'error',
        error: err?.userMessage || err?.message || 'Download failed. Please try again.',
      });
    } finally {
      if (mounted.current) setDownloading(null);
    }
  }, [current.jobId, cacheKey, fileBase, setKeyJob]);

  // --- Render states -------------------------------------------------------

  // Director-only. The backend intelligence-report routes are @Roles('director'),
  // but the frontend's STATE_OFFICIAL umbrella also covers other backend roles —
  // gate on the exact JWT role so non-directors never see an action that 403s.
  if (!isDirector) return null;

  // Disabled (nothing to analyse) — show a tooltip via title attribute.
  if (disabled && current.status === 'idle') {
    return (
      <span title={tooltip} className="inline-flex">
        <button
          type="button"
          disabled
          className={`${baseBtn} border-neutral-200 text-neutral-400 cursor-not-allowed`}
        >
          <Sparkles className={iconCls} />
          {btnLabel}
        </button>
      </span>
    );
  }

  // Generating / polling.
  if (current.status === 'generating') {
    return (
      <button
        type="button"
        disabled
        className={`${baseBtn} border-primary-300 text-primary-600 cursor-wait`}
      >
        <Loader2 className={`${iconCls} animate-spin`} />
        Generating…
      </button>
    );
  }

  // Ready — "Download Report" split dropdown.
  if (current.status === 'ready') {
    return (
      <div className="relative inline-flex" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className={`${baseBtn} border-primary-600 text-primary-600 hover:bg-primary-50`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          {downloading ? (
            <Loader2 className={`${iconCls} animate-spin`} />
          ) : (
            <Download className={iconCls} />
          )}
          Download Report
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-1 w-44 bg-white border border-neutral-200 rounded-lg shadow-lg z-20 overflow-hidden"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => handleDownload('pdf')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-primary-50 transition-colors"
            >
              <FileText className="w-4 h-4 text-red-500" />
              Export PDF
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => handleDownload('docx')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-primary-50 transition-colors border-t border-neutral-100"
            >
              <FileType className="w-4 h-4 text-blue-600" />
              Export Word
            </button>
          </div>
        )}
      </div>
    );
  }

  // Error — inline message + retry.
  if (current.status === 'error') {
    return (
      <div className="inline-flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs text-red-600 max-w-48 truncate" title={current.error}>
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {current.error || 'Generation failed'}
        </span>
        <button
          type="button"
          onClick={handleGenerate}
          className={`${baseBtn} border-primary-600 text-primary-600 hover:bg-primary-50`}
        >
          <Sparkles className={iconCls} />
          Retry
        </button>
      </div>
    );
  }

  // Idle (default).
  return (
    <button
      type="button"
      onClick={handleGenerate}
      className={`${baseBtn} border-primary-600 text-primary-600 hover:bg-primary-50`}
    >
      <Sparkles className={iconCls} />
      {btnLabel}
    </button>
  );
};

export default GenerateReportButton;
