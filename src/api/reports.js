import apiClient, { uploadFile, buildQueryString } from './client';
import { API_ENDPOINTS } from '../utils/constants';

/**
 * Reports API — backend uses an append-only op-log model.
 * - Create a draft with POST /reports
 * - Append field updates with POST /reports/:id/fields (field_set ops)
 * - State transitions are explicit endpoints (submit, open-review, approve, return, edit-returned)
 * - All payloads are camelCase. forbidNonWhitelisted: true → no extra fields.
 */

// Backend contract: POST /reports { formVersionId, submissionMethod } → draft.
export const createReport = async ({ formVersionId, submissionMethod = 'wizard' } = {}) => {
  const body = { submissionMethod };
  if (formVersionId) body.formVersionId = formVersionId;
  return apiClient.post(API_ENDPOINTS.REPORTS, body);
};

export const getReports = async (params = {}) => {
  const queryString = buildQueryString(params);
  return apiClient.get(`${API_ENDPOINTS.REPORTS}${queryString}`);
};

export const getReportById = async (reportId) =>
  apiClient.get(API_ENDPOINTS.REPORT_BY_ID(reportId));

// Full report contents (all fields + attachments) per the v1 contract.
export const getReportDetail = async (reportId) =>
  apiClient.get(API_ENDPOINTS.REPORT_DETAIL(reportId));

export const getReportOps = async (reportId) =>
  apiClient.get(API_ENDPOINTS.REPORT_OPS(reportId));

// Backend stores complex (array/object) field values as JSON strings.
const serializeFieldValue = (v) => (v !== null && typeof v === 'object' ? JSON.stringify(v) : v);

// Backend contract: POST /reports/:id/fields { key, value, source } — one field
// per request. Set each field individually; blanks/undefined are skipped.
export const setField = async (reportId, key, value, source = 'typed') =>
  apiClient.post(API_ENDPOINTS.REPORT_FIELDS(reportId), {
    key,
    value: serializeFieldValue(value),
    source,
  });

export const appendFieldOp = async (reportId, fields, source = 'typed') => {
  const results = [];
  for (const [key, value] of Object.entries(fields || {})) {
    if (value === undefined || value === null || value === '') continue;
    results.push(await setField(reportId, key, value, source));
  }
  return results;
};

export const submitReport = async (reportId) =>
  apiClient.post(API_ENDPOINTS.REPORT_SUBMIT(reportId));

export const openReview = async (reportId) =>
  apiClient.post(API_ENDPOINTS.REPORT_OPEN_REVIEW(reportId));

// Backend contract: /approve takes no body.
export const approveReport = async (reportId) =>
  apiClient.post(API_ENDPOINTS.REPORT_APPROVE(reportId), {});

// Backend contract: /return requires { notes } (1-2000 chars, mandatory).
export const returnReport = async (reportId, notes) => {
  const trimmed = (notes ?? '').toString().trim();
  if (!trimmed) {
    const err = new Error('Reviewer notes are required when returning a report.');
    err.status = 400;
    err.code = 'NOTES_REQUIRED';
    throw err;
  }
  if (trimmed.length > 2000) {
    const err = new Error('Reviewer notes must be 2000 characters or fewer.');
    err.status = 400;
    err.code = 'NOTES_TOO_LONG';
    throw err;
  }
  return apiClient.post(API_ENDPOINTS.REPORT_RETURN(reportId), { notes: trimmed });
};

// Combines open-review + approve/return into a single coordinator action.
// Backend state machine: submitted -> in_review -> approved | returned.
// /open-review on a report that is already in_review returns 409 — we swallow
// that so coordinators can re-decide without the UI tracking state.
export const reviewAndDecide = async (reportId, decision, notes = '') => {
  try {
    await openReview(reportId);
  } catch (err) {
    const status = err?.status || err?.response?.status;
    if (status !== 409) throw err;
  }
  if (decision === 'approve') return approveReport(reportId);
  if (decision === 'return') return returnReport(reportId, notes);
  throw new Error(`Unknown review decision: ${decision}`);
};

export const editReturned = async (reportId) =>
  apiClient.post(API_ENDPOINTS.REPORT_EDIT_RETURNED(reportId));

export const sealDue = async () =>
  apiClient.post(API_ENDPOINTS.REPORTS_SEAL_DUE);

/**
 * Submit a brand-new report by creating a draft, appending all fields,
 * uploading any voice notes/attachments, and submitting it in one go.
 * Returns the final report.
 */
export const submitNewReport = async ({ formVersionId, submissionMethod = 'wizard', fields = {}, attachments = [], voiceNotes = [], source = 'typed' } = {}) => {
  const draft = await createReport({ formVersionId, submissionMethod });
  const reportId = draft?.id ?? draft?.report?.id;
  if (!reportId) {
    throw new Error('Failed to create draft report');
  }
  if (Object.keys(fields).length) {
    await appendFieldOp(reportId, fields, source);
  }
  for (const att of attachments) {
    await uploadAttachment(reportId, att);
  }
  for (const vn of voiceNotes) {
    await uploadAttachment(reportId, { ...vn, kind: 'voice_note' });
  }
  return submitReport(reportId);
};

/**
 * Upload an attachment (photo, voice note, etc) tied to a report.
 * Expects either a File/Blob in `file`, or an object with { file, kind, fieldName }.
 */
export const uploadAttachment = async (reportId, payload) => {
  const data = payload instanceof File || payload instanceof Blob
    ? { file: payload, reportId }
    : { reportId, ...payload };
  return uploadFile(API_ENDPOINTS.ATTACHMENTS_UPLOAD, data);
};

export const listAttachments = async (reportId) =>
  apiClient.get(API_ENDPOINTS.ATTACHMENTS_BY_REPORT(reportId));

// ---------------------------------------------------------------------------
// Legacy shims — these mirror older call signatures (used across the UI) but
// route to the current backend contract. They return shapes that callers
// expect, and silently degrade for features the new backend does not yet
// support (transcription, AI suggestions). Remove once callers migrate.
// ---------------------------------------------------------------------------

const isVoiceNote = (att) =>
  att?.kind === 'voice_note' ||
  /^audio\//.test(att?.mimeType || att?.mime_type || '') ||
  /\.(mp3|m4a|wav|ogg|webm)$/i.test(att?.url || att?.fileName || att?.file_name || '');

export const getMySubmissions = async () => {
  const reports = await getReports();
  const list = Array.isArray(reports) ? reports : reports?.reports || [];
  // A month counts as "submitted" only when a non-draft report exists for it.
  // Drafts must not block re-entering the form for that month.
  const submittedMonths = [
    ...new Set(
      list
        .filter((r) => {
          const st = String(r.state || r.status || '').toLowerCase();
          return st && st !== 'draft';
        })
        .map((r) => r.reportMonth || r.report_month || r.month)
        .filter(Boolean),
    ),
  ];
  return { reports: list, submitted_months: submittedMonths, submittedMonths };
};

export const getSubmissionInfo = async (reportMonth = null) => {
  try {
    const params = reportMonth ? { reportMonth } : {};
    const reports = await getReports(params);
    const list = Array.isArray(reports) ? reports : reports?.reports || [];
    const match = reportMonth ? list.find((r) => (r.reportMonth || r.report_month || r.month) === reportMonth) : list[0];
    const st = String(match?.state || match?.status || '').toLowerCase();
    return {
      submitted: !!match && st !== 'draft',
      report: match || null,
      reportMonth: reportMonth || match?.reportMonth || match?.report_month || null,
    };
  } catch {
    return { submitted: false, report: null, reportMonth };
  }
};

export const checkSubmitted = async (month) => {
  const info = await getSubmissionInfo(month);
  return { submitted: info.submitted, month };
};

export const getExistingDraft = async (reportMonth = null) => {
  try {
    const params = { state: 'draft' };
    if (reportMonth) params.reportMonth = reportMonth;
    const reports = await getReports(params);
    const list = Array.isArray(reports) ? reports : reports?.reports || [];
    return list[0] || null;
  } catch {
    return null;
  }
};

export const saveDraft = async (data = {}) => {
  const { reportId, id, formVersionId, submissionMethod, ...fields } = data;
  if (reportId || id) {
    await appendFieldOp(reportId || id, fields);
    return getReportById(reportId || id);
  }
  const draft = await createReport({ formVersionId, submissionMethod });
  const newId = draft?.id ?? draft?.report?.id;
  if (newId && Object.keys(fields).length) {
    await appendFieldOp(newId, fields);
  }
  return draft;
};

export const deleteDraft = async (_draftId) => {
  // Backend has no delete-draft endpoint; drafts are sealed by the backend on schedule.
  return { ok: true };
};

export const updateReport = async (reportId, data) => {
  await appendFieldOp(reportId, data);
  return getReportById(reportId);
};

export const reviewReport = async (reportId, status, notes = '') => {
  if (status === 'approved' || status === 'REVIEWED') return reviewAndDecide(reportId, 'approve');
  if (status === 'returned' || status === 'FLAGGED' || status === 'DECLINED') return reviewAndDecide(reportId, 'return', notes);
  if (status === 'in_review') return openReview(reportId);
  return getReportById(reportId);
};

export const uploadAttendancePhoto = async (reportId, file) =>
  uploadAttachment(reportId, { file, kind: 'attendance_photo' });

export const uploadVoiceNote = async (reportId, fieldName, audioBlob, mimeType = 'audio/webm') => {
  const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
  const file = new File([audioBlob], `voice_${fieldName}.${ext}`, { type: mimeType });
  return uploadAttachment(reportId, { file, kind: 'voice_note', fieldName });
};

export const fetchVoiceNotes = async (reportId) => {
  const list = await listAttachments(reportId);
  const arr = Array.isArray(list) ? list : list?.attachments || [];
  return arr.filter(isVoiceNote);
};

export const fetchVoiceNoteAudio = async (_voiceNoteId) => {
  // Attachment download is direct via the URL returned by listAttachments; no separate audio endpoint.
  return null;
};

export const downloadVoiceNote = async (_voiceNoteId) => {
  return null;
};

export const deleteVoiceNote = async (_voiceNoteId) => {
  return { ok: true };
};

export const triggerTranscription = async (_voiceNoteId) => {
  return { status: 'unsupported' };
};

export const getAISuggestions = async (_reportId) => ({ suggestions: [], status: 'unsupported' });
export const acceptAISuggestions = async (_reportId, _fields) => ({ ok: false, status: 'unsupported' });

