// Attachment / uploaded-file URL helpers.
//
// The v1 op-log backend returns report photos (and voice notes) in the report's
// `attachments[]` array — NOT as `group_photos` / `attendance_photos` fields.
// Each attachment carries a `kind` (confirmed values from the submit flow:
// 'group_photo', 'attendance_photo', 'voice_note') plus a URL/path. These helpers
// map that array into ready-to-render URL lists and resolve relative paths against
// the file-serving origin.

const RAW_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:8000/api/v1' : 'https://kadwdc.equily.ng/api/v1');

// Origin that serves uploaded files: strip a trailing `/api` or `/api/vN`.
// (The previous `/api$` strip left `/api/v1` in place, producing broken URLs.)
export const UPLOAD_ORIGIN = RAW_BASE.replace(/\/api(\/v\d+)?\/?$/, '');

// Resolve a raw path/URL into a loadable URL. Absolute URLs (and data:/blob:)
// pass through untouched; relative paths are joined onto the upload origin.
export const resolveUploadUrl = (raw) => {
  if (!raw) return '';
  const s = String(raw).trim();
  if (!s) return '';
  if (/^(https?:)?\/\//i.test(s) || s.startsWith('data:') || s.startsWith('blob:')) return s;
  return `${UPLOAD_ORIGIN}/${s.replace(/^\/+/, '')}`;
};

// Candidate URL/path keys, in priority order — tolerant of backend naming.
const ATT_URL_KEYS = [
  'url', 'fileUrl', 'downloadUrl', 'signedUrl', 'publicUrl',
  'path', 'filePath', 'storageKey', 'key', 'fileName', 'file_name',
];

// Resolve a single attachment (object or bare string) into a loadable URL.
export const attachmentUrl = (a) => {
  if (!a) return '';
  if (typeof a === 'string') return resolveUploadUrl(a);
  for (const k of ATT_URL_KEYS) {
    if (a[k]) return resolveUploadUrl(a[k]);
  }
  return '';
};

const kindOf = (a) => String(a?.kind || a?.type || a?.category || '').toLowerCase();

// Filter an attachments array by a kind matcher and return resolved URLs.
const selectPhotos = (attachments, matcher) =>
  (Array.isArray(attachments) ? attachments : [])
    .filter((a) => matcher(kindOf(a)))
    .map(attachmentUrl)
    .filter(Boolean);

// Confirmed backend `kind` enum: image | audio | document | attendance_photo |
// group_photo | voice_note. Attendance photos are matched first (below); any
// remaining image — including the generic 'image' kind — is shown as a meeting photo.
export const attendancePhotoUrls = (attachments) =>
  selectPhotos(attachments, (k) => k.includes('attendance'));

export const groupPhotoUrls = (attachments) =>
  selectPhotos(
    attachments,
    (k) => !k.includes('attendance') && (k.includes('group') || k.includes('meeting') || k === 'image'),
  );
