import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, Info, Calendar, AlertTriangle, Loader2 } from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Alert from '../components/common/Alert';
import WDCReportWizard from '../components/wdc/WDCReportWizard';
import DraftStatusBar from '../components/wdc/DraftStatusBar';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import apiClient from '../api/client';
import { API_ENDPOINTS } from '../utils/constants';
import { getSubmissionInfo as getLocalSubmissionInfo, getTargetReportMonth, formatMonthDisplay, getSubmissionPeriodDescription } from '../utils/dateUtils';
import { getSubmissionInfo, getExistingDraft, saveDraft } from '../api/reports';

// ────────────────────────────────────────────────────────────────
// Initial form state — mirrors every field from the original form
// ────────────────────────────────────────────────────────────────
const buildInitialFormData = (userWard, userLGA) => ({
  // Header
  state: 'Kaduna State',
  lga_id: userLGA?.id || '',
  ward_id: userWard?.id || '',
  report_date: new Date().toISOString().split('T')[0],
  report_time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),

  // Section 1: Agenda & Governance
  meeting_type: 'Monthly',
  agenda_opening_prayer: true,
  agenda_minutes: true,
  agenda_action_tracker: true,
  agenda_reports: true,
  agenda_action_plan: true,
  agenda_aob: true,
  agenda_closing: true,

  // Section 2: Action Tracker
  action_tracker: [
    { action_point: '', status: '', challenges: '', timeline: '', responsible_person: '' },
  ],

  // Section 3A: Health Data
  health_general_attendance_total: '',
  health_opd_total: '',
  health_routine_immunization_total: '',
  health_penta1: '',
  health_bcg: '',
  health_penta3: '',
  health_measles: '',
  health_malaria_under5: '',
  health_diarrhea_under5: '',
  health_anc_total: '',
  health_anc_first_visit: '',
  health_anc_fourth_visit: '',
  health_anc_eighth_visit: '',
  health_deliveries: '',
  health_postnatal: '',
  health_fp_counselling: '',
  health_fp_new_acceptors: '',
  health_hepb_tested: '',
  health_hepb_positive: '',
  health_tb_presumptive: '',
  health_tb_on_treatment: '',

  // Section 3B: Health Facility Support
  facility_renovated: '',
  facility_renovated_count: '',
  facility_renovations: [],
  items_donated_count: '',
  items_donated_types: [],
  items_donated_other_specify: '',
  items_donated_govt_count: '',
  items_donated_govt_types: [],
  items_donated_govt_other_specify: '',
  items_repaired_count: '',
  items_repaired_types: [],
  items_repaired_other_specify: '',

  // Section 3C: Transportation & Emergency
  women_transported_anc: '',
  women_transported_delivery: '',
  children_transported_danger: '',
  women_supported_delivery_items: '',

  // Section 3D: cMPDSR
  maternal_deaths: '',
  perinatal_deaths: '',
  maternal_death_causes: ['', '', ''],
  perinatal_death_causes: ['', '', ''],

  // Section 4: Community Feedback
  town_hall_conducted: '',
  community_feedback: [
    { indicator: "Health Workers' Attitude", feedback: '', action_required: '' },
    { indicator: 'Waiting Time', feedback: '', action_required: '' },
    { indicator: 'Service Charges / Fees', feedback: '', action_required: '' },
    { indicator: 'Client Satisfaction', feedback: '', action_required: '' },
    { indicator: 'Others', feedback: '', action_required: '' },
  ],

  // Section 5: VDC Reports
  vdc_reports: [{ vdc_name: '', issues: '', action_taken: '' }],

  // Section 6: Community Mobilization
  awareness_topic: '',
  traditional_leaders_support: '',
  religious_leaders_support: '',

  // Section 7: Community Action Plan
  action_plan: [{ issue: '', action: '', timeline: '', responsible_person: '' }],

  // Section 8: Support & Conclusion
  support_required: '',
  aob: '',
  attendance_total: '',
  attendance_male: '',
  attendance_female: '',
  next_meeting_date: '',
  chairman_signature: '',
  secretary_signature: '',

  // File attachments — not serialised to drafts (File objects)
  _attendance_pictures: [],
  _group_photos: [],
});

// Strip non-serialisable keys (underscore-prefixed + File objects) for draft save
const serializableFormData = (data) => {
  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('_')) continue; // skip file arrays & injected context
    clean[key] = value;
  }
  return clean;
};

// ────────────────────────────────────────────────────────────────
// Generate list of selectable months (last 12 months + current)
// ────────────────────────────────────────────────────────────────
const generateMonthOptions = () => {
  const months = [];
  const now = new Date();
  // Show last 12 months plus current month
  for (let i = 12; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${month}`);
  }
  // Also add next month to demonstrate "future month" blocking
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextYear = next.getFullYear();
  const nextMonth = String(next.getMonth() + 1).padStart(2, '0');
  months.push(`${nextYear}-${nextMonth}`);

  return months;
};

// ────────────────────────────────────────────────────────────────
// Check if a month is in the future
// ────────────────────────────────────────────────────────────────
const isFutureMonth = (monthStr) => {
  const [year, month] = monthStr.split('-').map(Number);
  const now = new Date();
  const selected = new Date(year, month - 1, 1);
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return selected > currentMonthStart;
};

// ────────────────────────────────────────────────────────────────
// Page component
// ────────────────────────────────────────────────────────────────
const SubmitReportPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, verifyToken } = useAuth();
  const { toast } = useToast();

  // Get preselected month from navigation state (from dashboard modal)
  const preselectedMonth = location.state?.preselectedMonth;

  // Phase: 'select_month' | 'checking' | 'form'
  const [phase, setPhase] = useState(preselectedMonth ? 'form' : 'select_month');

  // Month selector state
  const [selectedMonth, setSelectedMonth] = useState(preselectedMonth || '');
  const [monthError, setMonthError] = useState('');
  const [checkingMonth, setCheckingMonth] = useState(false);

  // Page-level state
  const [loading, setLoading] = useState(false);
  const [submissionInfo, setSubmissionInfo] = useState(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [reportMonth, setReportMonth] = useState(preselectedMonth || '');
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [localDraftStatus, setLocalDraftStatus] = useState('idle');
  const [localLastSavedAt, setLocalLastSavedAt] = useState(null);

  // Form state
  const userWard = { id: user?.ward?.id, name: user?.ward?.name };
  const userLGA = { id: user?.ward?.lga_id || user?.lga?.id, name: user?.ward?.lga_name || user?.lga?.name };
  const [formData, setFormData] = useState(() => buildInitialFormData(userWard, userLGA));
  const [voiceNotes, setVoiceNotes] = useState({});

  // Refs for debounce / latest formData
  const debounceRef = useRef(null);
  const formDataRef = useRef(formData);
  useEffect(() => { formDataRef.current = formData; }, [formData]);

  // Pre-select the target month on load (only if no preselected month)
  useEffect(() => {
    if (!preselectedMonth) {
      const target = getTargetReportMonth();
      setSelectedMonth(target);
    }
  }, [preselectedMonth]);

  // ── Online / Offline listeners ──────────────────────────────
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ── Handle month selection & validation ──────────────────────
  const handleMonthConfirm = useCallback(async () => {
    setMonthError('');

    if (!selectedMonth) {
      setMonthError('Please select a month.');
      return;
    }

    // Block future months
    if (isFutureMonth(selectedMonth)) {
      setMonthError(`${formatMonthDisplay(selectedMonth)} has not ended yet. You cannot submit a report for a future month.`);
      return;
    }

    setCheckingMonth(true);

    try {
      // Verify token before checking
      await verifyToken().catch(() => {});

      // Check submission status for the selected month
      if (isOnline) {
        try {
          const infoResponse = await getSubmissionInfo(selectedMonth);
          const info = infoResponse?.data || {};

          if (info.already_submitted) {
            setMonthError(`A report for ${formatMonthDisplay(selectedMonth)} has already been submitted. You cannot submit again for the same month.`);
            setCheckingMonth(false);
            return;
          }

          setSubmissionInfo(info);
        } catch {
          // If network fails, proceed — the backend will reject duplicates anyway
        }
      }

      // All good — proceed to form
      setReportMonth(selectedMonth);
      setAlreadySubmitted(false);
      setPhase('form');
    } catch {
      // proceed optimistically
      setReportMonth(selectedMonth);
      setPhase('form');
    } finally {
      setCheckingMonth(false);
    }
  }, [selectedMonth, isOnline, verifyToken]);

  // ── Draft key ───────────────────────────────────────────────
  const getDraftKey = useCallback(() => {
    if (!user?.id || !userWard?.id || !reportMonth) return null;
    return `wdc_draft:${user.id}:${userWard.id}:${reportMonth}`;
  }, [user?.id, userWard?.id, reportMonth]);

  // ── Save draft to localStorage ──────────────────────────────
  const saveDraftToLocal = useCallback((data, instant = false) => {
    const key = getDraftKey();
    if (!key) return false;
    try {
      const payload = { formData: serializableFormData(data), savedAt: new Date().toISOString(), version: 1 };
      localStorage.setItem(key, JSON.stringify(payload));
      setLocalLastSavedAt(new Date());
      setLocalDraftStatus('saved');
      return true;
    } catch {
      setLocalDraftStatus('error');
      return false;
    }
  }, [getDraftKey]);

  // ── Load draft from localStorage ────────────────────────────
  const loadDraftFromLocal = useCallback(() => {
    const key = getDraftKey();
    if (!key) return null;
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }, [getDraftKey]);

  // ── Debounced auto-save on form changes ─────────────────────
  useEffect(() => {
    if (!getDraftKey() || isLoadingDraft) return;
    setLocalDraftStatus('saving');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveDraftToLocal(formData), 1000);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [formData, getDraftKey, saveDraftToLocal, isLoadingDraft]);

  // ── Save on visibility change ───────────────────────────────
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'hidden' && getDraftKey()) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        saveDraftToLocal(formDataRef.current, true);
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [saveDraftToLocal, getDraftKey]);

  // ── Save on beforeunload ────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      if (getDraftKey()) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        saveDraftToLocal(formDataRef.current, true);
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveDraftToLocal, getDraftKey]);

  // ── Load draft when reportMonth is set ──────────────────────
  useEffect(() => {
    if (!reportMonth || !user?.id || !userWard?.id) return;

    const applyDraftData = (draftData) => {
      setFormData((prev) => ({
        ...prev,
        ...draftData,
        action_tracker: draftData.action_tracker || prev.action_tracker,
        community_feedback: draftData.community_feedback || prev.community_feedback,
        vdc_reports: draftData.vdc_reports || prev.vdc_reports,
        action_plan: draftData.action_plan || prev.action_plan,
        maternal_death_causes: draftData.maternal_death_causes || prev.maternal_death_causes,
        perinatal_death_causes: draftData.perinatal_death_causes || prev.perinatal_death_causes,
        facility_renovations: draftData.facility_renovations || prev.facility_renovations,
        items_donated_types: draftData.items_donated_types || prev.items_donated_types,
        items_donated_govt_types: draftData.items_donated_govt_types || prev.items_donated_govt_types,
        items_repaired_types: draftData.items_repaired_types || prev.items_repaired_types,
        // Don't overwrite file arrays from drafts
        _attendance_pictures: prev._attendance_pictures,
        _group_photos: prev._group_photos,
      }));
      setLocalDraftStatus('saved');
    };

    const loadDraft = async () => {
      try {
        setIsLoadingDraft(true);
        const localDraft = loadDraftFromLocal();

        let serverDraft = null;
        if (isOnline) {
          try {
            const response = await getExistingDraft(reportMonth);
            if (response.has_draft && response.report_data) {
              serverDraft = { formData: response.report_data, savedAt: response.saved_at, draftId: response.draft_id };
            }
          } catch { /* offline or no draft */ }
        }

        if (localDraft && serverDraft) {
          const localTime = new Date(localDraft.savedAt).getTime();
          const serverTime = new Date(serverDraft.savedAt).getTime();
          applyDraftData(localTime > serverTime ? localDraft.formData : serverDraft.formData);
        } else if (localDraft) {
          applyDraftData(localDraft.formData);
          setLocalLastSavedAt(new Date(localDraft.savedAt));
        } else if (serverDraft) {
          applyDraftData(serverDraft.formData);
        }
      } catch { /* use initial state */ } finally {
        setIsLoadingDraft(false);
      }
    };

    loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportMonth, user?.id, userWard?.id]);

  // ── Voice note handler ──────────────────────────────────────
  const handleVoiceNote = useCallback((fieldName, file) => {
    setVoiceNotes((prev) => ({ ...prev, [fieldName]: file }));
  }, []);

  // ── Offline queue ───────────────────────────────────────────
  const { addToQueue, getQueueStats, retryFailed, isSyncing } = useOfflineQueue({
    submitFn: async (data, month, headers) => {
      const formPayload = new FormData();
      formPayload.append('report_month', month);
      formPayload.append('report_data', JSON.stringify(data));
      return apiClient.post('/reports', formPayload, {
        headers: { 'Content-Type': 'multipart/form-data', ...headers },
      });
    },
  });

  // ── Submit mutation ─────────────────────────────────────────
  const submitMutation = useMutation({
    mutationFn: async (data) => {
      const formPayload = new FormData();
      formPayload.append('report_month', reportMonth);
      formPayload.append('report_data', JSON.stringify(serializableFormData(data)));

      // Voice notes
      Object.entries(voiceNotes).forEach(([fieldName, file]) => {
        if (file) formPayload.append(`voice_${fieldName}`, file);
      });

      // Attendance pictures
      (data._attendance_pictures || []).forEach((pic, idx) => {
        formPayload.append(`attendance_picture_${idx}`, pic.file);
      });

      // Group photos
      (data._group_photos || []).forEach((pic, idx) => {
        formPayload.append(`group_photo_${idx}`, pic.file);
      });

      return apiClient.post('/reports', formPayload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      // Clear the local draft on successful submission
      const key = getDraftKey();
      if (key) localStorage.removeItem(key);

      setSubmitSuccess(true);
      toast.success('Your monthly report has been submitted successfully!', {
        title: 'Report Submitted',
        duration: 6000,
      });
      setTimeout(() => navigate('/wdc'), 2500);
    },
    onError: (error) => {
      const msg = error.message || 'Failed to submit report. Please try again.';
      setSubmitError(msg);
      toast.error(msg, { title: 'Submission Failed' });
    },
  });

  // ── Server draft save mutation ──────────────────────────────
  const draftMutation = useMutation({
    mutationFn: async (data) => {
      const formPayload = new FormData();
      formPayload.append('report_month', reportMonth);
      formPayload.append('report_data', JSON.stringify(serializableFormData(data)));
      const firstVoice = Object.values(voiceNotes)[0];
      if (firstVoice) formPayload.append('voice_note', firstVoice);
      return saveDraft(formPayload);
    },
    onSuccess: () => {
      toast.success('Draft saved to server.');
    },
    onError: (error) => {
      if (error.isNetworkError) {
        toast.warning('Draft saved locally. Will sync when reconnected.');
      } else {
        toast.error(error.message || 'Failed to save draft to server', { title: 'Draft Save Failed' });
      }
    },
  });

  // ── Validate & submit ───────────────────────────────────────
  const handleSubmit = useCallback(() => {
    setSubmitError(null);

    if (!userLGA?.id || !userWard?.id) {
      const msg = 'Your account is missing State/LGA/Ward assignment. Contact admin.';
      setSubmitError(msg);
      toast.error(msg);
      return;
    }

    const data = { ...formData, state: 'Kaduna State', lga_id: userLGA.id, ward_id: userWard.id };

    if (isOnline) {
      submitMutation.mutate(data);
    } else {
      try {
        addToQueue({ formData: serializableFormData(data), reportMonth });
        setSubmitSuccess(true);
        toast.warning('You are offline. Your report will be submitted when you reconnect.', {
          title: 'Saved Offline', duration: 8000,
        });
      } catch (err) {
        const msg = `Failed to queue offline: ${err.message}`;
        setSubmitError(msg);
        toast.error(msg);
      }
    }
  }, [formData, userLGA, userWard, isOnline, reportMonth, submitMutation, addToQueue, toast]);

  // ── Manual save draft handler ───────────────────────────────
  const handleSaveDraft = useCallback(() => {
    setSubmitError(null);
    const saved = saveDraftToLocal(formData, true);
    if (saved && isOnline) {
      draftMutation.mutate(formData);
    }
  }, [formData, isOnline, saveDraftToLocal, draftMutation]);

  // ── onChange handler (functional updater compatible) ─────────
  const handleFormChange = useCallback((updaterOrObj) => {
    if (typeof updaterOrObj === 'function') {
      setFormData(updaterOrObj);
    } else {
      setFormData((prev) => ({ ...prev, ...updaterOrObj }));
    }
  }, []);

  const handleCancel = () => {
    if (phase === 'form') {
      // Go back to month selector
      setPhase('select_month');
      setReportMonth('');
      setFormData(buildInitialFormData(userWard, userLGA));
      setIsLoadingDraft(true);
      setLocalDraftStatus('idle');
      setMonthError('');
    } else {
      navigate('/wdc');
    }
  };

  // ── RENDER ──────────────────────────────────────────────────

  // Success screen
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Report Submitted!</h2>
          <p className="text-gray-600 mb-1">Your WDC monthly report has been recorded successfully.</p>
          {!isOnline && (
            <p className="text-amber-600 text-sm mt-2">
              Queued offline — will sync automatically when you reconnect.
            </p>
          )}
          {Object.values(voiceNotes).some(Boolean) && (
            <p className="text-sm text-blue-600 mt-2">
              Voice notes are being transcribed and will fill corresponding fields.
            </p>
          )}
          <div className="flex gap-3 justify-center mt-8">
            <Button onClick={() => navigate('/wdc/reports')}>View Reports</Button>
            <Button variant="outline" onClick={() => navigate('/wdc')}>Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-primary-50/30">
      {/* ── Sticky Header ────────────────────────────────────── */}
      <div className="bg-white border-b border-neutral-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" icon={ArrowLeft} onClick={handleCancel} className="!p-2">
              <span className="hidden sm:inline">{phase === 'form' ? 'Change Month' : 'Back'}</span>
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-neutral-900 flex items-center gap-2 truncate">
                Submit Monthly Report
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
                  v3.0
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 truncate">
                {userWard?.name || 'Your Ward'} &bull; {userLGA?.name || 'Your LGA'}
                {reportMonth && phase === 'form' && (
                  <> &bull; <span className="font-semibold text-green-700">{formatMonthDisplay(reportMonth)}</span></>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 py-5 sm:py-6">
        {/* ── PHASE: Month Selector ──────────────────────────── */}
        {phase === 'select_month' && (
          <Card>
            <div className="py-8 px-4 sm:px-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  Select Report Month
                </h2>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Choose the month you are submitting a report for. You can only submit for past or current months that have not been submitted yet.
                </p>
              </div>

              <div className="max-w-sm mx-auto space-y-4">
                <div className="space-y-1">
                  <label htmlFor="month-select" className="block text-sm font-medium text-gray-700">
                    Report Month <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="month-select"
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      setMonthError('');
                    }}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all bg-white"
                  >
                    <option value="">-- Select a month --</option>
                    {generateMonthOptions().map((m) => (
                      <option key={m} value={m}>
                        {formatMonthDisplay(m)}
                        {isFutureMonth(m) ? ' (Future)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {monthError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{monthError}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleMonthConfirm}
                  disabled={checkingMonth || !selectedMonth}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-green-600/25"
                >
                  {checkingMonth ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    'Continue'
                  )}
                </button>
              </div>

              {/* Info box */}
              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-md mx-auto">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-700 space-y-1">
                    <p className="font-semibold">Submission Rules:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>You can submit for any past month that hasn't been submitted</li>
                      <li>Future months are not allowed</li>
                      <li>Each month can only be submitted once per ward</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* ── PHASE: Form ────────────────────────────────────── */}
        {phase === 'form' && (
          <>
            {isLoadingDraft ? (
              <div className="text-center py-16">
                <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-neutral-500 text-sm">Loading your saved draft...</p>
              </div>
            ) : (
              <>
                {/* Submission Period Banner */}
                {reportMonth && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-5">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <h4 className="font-semibold text-blue-900 text-sm">Reporting For</h4>
                        <p className="text-xs text-blue-800 font-semibold mt-1">
                          Report Month: <span className="font-bold">{formatMonthDisplay(reportMonth)}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Draft & Offline Status */}
                <div className="mb-5">
                  <DraftStatusBar
                    draftStatus={localDraftStatus}
                    lastSavedAt={localLastSavedAt}
                    isOnline={isOnline}
                    queueStats={getQueueStats()}
                    isSyncing={isSyncing}
                    onForceSave={() => saveDraftToLocal(formData, true)}
                    onRetryFailed={retryFailed}
                  />
                </div>

                {/* Error Alert */}
                {submitError && (
                  <div className="mb-5">
                    <Alert type="error" message={submitError} onClose={() => setSubmitError(null)} />
                  </div>
                )}

                {/* ── Wizard Form ────────────────────────────────── */}
                <WDCReportWizard
                  formData={formData}
                  onChange={handleFormChange}
                  onSubmit={handleSubmit}
                  onSaveDraft={handleSaveDraft}
                  draftStatus={localDraftStatus}
                  onVoiceNote={handleVoiceNote}
                  userLGA={userLGA}
                  userWard={userWard}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SubmitReportPage;
