# KADWDC PWA — Comprehensive Challenge Solutions

## Architecture Context

| Layer | Stack |
|-------|-------|
| Frontend | React 18, Vite 5, Tailwind CSS, TanStack React Query v5, React Router v6 |
| Backend | FastAPI 0.109, SQLAlchemy 2.0, SQLite (dev) / PostgreSQL (prod) |
| Mobile | React Native 0.76 + Expo SDK 54 |
| Auth | JWT (HS256, 24-hour expiry, no refresh token) |
| PWA | vite-plugin-pwa, Workbox (CacheFirst images, NetworkFirst API) |
| Storage | Local filesystem (`backend/uploads/`) — no cloud storage |

---

## Priority Matrix

| # | Challenge | Severity | Effort | Priority |
|---|-----------|----------|--------|----------|
| 1 | Auto Log-outs | **Critical** | Medium | P0 |
| 2 | Error Message Visibility | High | Low | P1 |
| 3 | Attachment Upload Failures | High | High | P1 |
| 4 | Draft Saving | **Critical** | Low | P0 |
| 5 | Offline Mode | High | High | P1 |
| 6 | Dashboard Stats Not Updating | Medium | Medium | P2 |
| 7 | KoboCollect-Style Form | Medium | High | P2 |

**Recommended execution order:** 1 → 4 → 2 → 5 → 3 → 6 → 7

---

## Challenge 1: Auto Log-outs During Active Sessions

### Problem Analysis

**Root causes identified in the codebase:**

1. **No refresh token mechanism.** The backend issues a single JWT with a 24-hour expiry (`config.py:10` — `ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24`). There is no `/auth/refresh` endpoint. Once the JWT expires, the user is logged out regardless of activity.

2. **Session manager cannot extend token lifetime.** `useSessionManager.js:85-96` calls `GET /auth/me` as a "refresh", but this only fetches user data — it does NOT issue a new token. The original 24-hour JWT continues counting down.

3. **Aggressive idle timeout with edge cases.** The 25-minute idle → 5-minute warning → forced logout (`useSessionManager.js:23-24`) does not account for:
   - Long form-filling where the user types in a single text field without moving the mouse (the debounce at 500ms can miss rapid bursts).
   - Users reading long content without triggering any events.
   - Mobile users where `mousemove` never fires.

4. **401 interceptor is abrupt.** `client.js:49-61` clears auth and redirects to `/login` on ANY 401, including temporary network glitches that return a 401-like response from intermediate proxies.

**Impact:** Users in rural Kaduna State filling 84KB WDC report forms lose 20-30 minutes of data entry when unexpectedly logged out.

### Proposed Solution

#### A. Add JWT Refresh Token (Backend)

```python
# backend/app/config.py — Add refresh token config
ACCESS_TOKEN_EXPIRE_MINUTES = 60          # Short-lived: 1 hour
REFRESH_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # Long-lived: 7 days
```

```python
# backend/app/routers/auth.py — New refresh endpoint
@router.post("/auth/refresh")
async def refresh_token(
    request: Request,
    db: Session = Depends(get_db)
):
    """Issue a new access token using a valid refresh token."""
    refresh_token = request.headers.get("X-Refresh-Token")
    if not refresh_token:
        raise HTTPException(401, "Refresh token required")

    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Invalid token type")

        user_id = payload.get("sub")
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user or not user.is_active:
            raise HTTPException(401, "User not found or inactive")

        # Issue new access token
        new_access_token = create_access_token({"sub": str(user.id)})
        return {
            "success": True,
            "access_token": new_access_token,
            "token_type": "bearer"
        }
    except JWTError:
        raise HTTPException(401, "Invalid or expired refresh token")
```

#### B. Proactive Token Refresh (Frontend)

```javascript
// frontend/src/api/client.js — Add token refresh interceptor
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(token);
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response.data?.success ? response.data : response.data,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        const { access_token } = await axios.post(
          `${BASE_URL}/auth/refresh`,
          null,
          { headers: { 'X-Refresh-Token': refreshToken } }
        );

        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, access_token);
        processQueue(null, access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Only now do we actually log out
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        emitToast('warning', 'Your session has expired. Please log in again.');
        setTimeout(() => { window.location.href = '/login'; }, 1500);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    // ... rest of error handling
  }
);
```

#### C. Improve Activity Detection

```javascript
// useSessionManager.js — Add form interaction events
const events = [
  'mousedown', 'mousemove', 'keydown', 'keyup',
  'touchstart', 'touchmove', 'scroll', 'click',
  'input', 'change', 'focus',  // ← catches typing in forms
  'pointerdown',               // ← unifies mouse + touch + pen
];
```

#### D. Pre-Emptive Background Refresh

```javascript
// useSessionManager.js — Schedule token refresh at 80% of expiry
useEffect(() => {
  if (!enabled) return;

  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  if (!token) return;

  // Decode JWT exp without a library
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresAt = payload.exp * 1000;
    const now = Date.now();
    const refreshAt = now + (expiresAt - now) * 0.8; // Refresh at 80% of lifetime

    const timer = setTimeout(async () => {
      await refreshTokenSilently();
    }, refreshAt - now);

    return () => clearTimeout(timer);
  } catch { /* malformed token — let 401 handler deal with it */ }
}, [enabled]);
```

### Edge Cases

| Scenario | Mitigation |
|----------|------------|
| Refresh token also expired | Graceful logout with draft auto-save (fires `beforeunload`) |
| Multiple tabs racing to refresh | `isRefreshing` flag + queue pattern prevents duplicate refresh calls |
| Offline during refresh attempt | Network error handler saves draft locally; sync on reconnect |
| User on mobile with screen off | `visibilitychange` event triggers draft save; session timer pauses |

### Testing Strategy

- **Unit:** Mock JWT decode, test timer scheduling at 80% expiry boundary
- **Integration:** Simulate token expiry mid-form-fill, verify draft is preserved and session transparently refreshes
- **E2E:** Playwright test: fill form → wait for token near-expiry → verify no interruption
- **Monitoring:** Log refresh failures to Sentry; alert if refresh failure rate > 5%

### Benefits

- Eliminates mid-session logouts for active users
- 7-day refresh window means users on poor networks can resume without re-authenticating
- Draft auto-save on logout ensures zero data loss even in worst case

---

## Challenge 2: Error Message Visibility

### Problem Analysis

**Current state in the codebase:**

1. **Toast notifications (`useToast.jsx`)** appear top-right, auto-dismiss after 5-8 seconds. On mobile screens, they can be obscured by the navbar. Error toasts (red) don't have sufficient contrast — they use `bg-red-50 text-red-800` which meets WCAG AA but the small size and brief display make them easy to miss.

2. **No ARIA live region.** Toasts are not announced to screen readers. The `ToastContainer` uses CSS transitions but no `role="alert"` or `aria-live="assertive"`.

3. **Form validation errors are inconsistent.** The static `WDCReportForm.jsx` (84KB) uses inline red text for some fields but not all. `DynamicForm.jsx` has per-field validation but errors clear on focus, making them transient.

4. **API error messages are too generic.** `client.js:120-134` maps status codes to generic strings like "Invalid request" which don't tell users what to fix.

5. **422 Pydantic errors are comma-joined into a single string** (`client.js:71-76`), making multi-field errors unreadable: `"Validation errors: body.meeting_date: field required, body.attendees: value too small"`.

### Proposed Solution

#### A. Make Toasts Accessible and Persistent for Errors

```jsx
// ToastContainer.jsx — Add ARIA and persistent error behavior
<div
  role="alert"
  aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
  aria-atomic="true"
  className={`
    toast-item
    ${toast.type === 'error' ? 'toast-error-persistent' : ''}
  `}
>
  <div className="flex items-start gap-3">
    <Icon className="flex-shrink-0 mt-0.5" />
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-sm">{toast.title}</p>
      <p className="text-sm mt-0.5">{toast.message}</p>
      {toast.type === 'error' && toast.actions && (
        <div className="mt-2 flex gap-2">
          {toast.actions.map((action, i) => (
            <button key={i} onClick={action.onClick}
              className="text-xs font-medium underline">
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
    {/* Error toasts require manual dismissal */}
    <button
      onClick={() => removeToast(toast.id)}
      aria-label="Dismiss notification"
      className="flex-shrink-0 p-1 rounded-full hover:bg-black/10"
    >
      <X size={14} />
    </button>
  </div>
</div>
```

**Key changes:**
- Error toasts: `duration: 0` (don't auto-dismiss) + require manual close
- Info/success toasts: keep auto-dismiss behavior
- Add `role="alert"` + `aria-live="assertive"` for errors
- Add action buttons (e.g., "Retry", "Go to field") on error toasts

#### B. Inline Validation with Field-Level Error Display

```jsx
// components/common/FormField.jsx — Reusable error-aware field wrapper
const FormField = ({ name, label, error, required, children }) => (
  <div className="space-y-1">
    <label htmlFor={name} className="block text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
    </label>
    {children}
    {error && (
      <p
        id={`${name}-error`}
        role="alert"
        className="text-sm text-red-600 flex items-center gap-1 mt-1"
      >
        <AlertCircle size={14} className="flex-shrink-0" />
        {error}
      </p>
    )}
  </div>
);

// Usage in form fields:
<FormField name="meeting_date" label="Meeting Date" error={errors.meeting_date} required>
  <input
    id="meeting_date"
    name="meeting_date"
    type="date"
    aria-invalid={!!errors.meeting_date}
    aria-describedby={errors.meeting_date ? 'meeting_date-error' : undefined}
    className={`input-base ${errors.meeting_date ? 'border-red-500 ring-red-200' : ''}`}
  />
</FormField>
```

#### C. Error Summary Banner at Top of Form

```jsx
// Show when submission fails with multiple errors
{Object.keys(errors).length > 0 && (
  <div
    role="alert"
    className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mb-6"
  >
    <div className="flex items-center gap-2 mb-2">
      <AlertTriangle className="text-red-500" size={20} />
      <h3 className="font-semibold text-red-800">
        Please fix {Object.keys(errors).length} error(s) before submitting
      </h3>
    </div>
    <ul className="list-disc list-inside space-y-1">
      {Object.entries(errors).map(([field, msg]) => (
        <li key={field}>
          <button
            className="text-red-700 underline text-sm hover:text-red-900"
            onClick={() => document.getElementById(field)?.focus()}
          >
            {fieldLabels[field] || field}: {msg}
          </button>
        </li>
      ))}
    </ul>
  </div>
)}
```

#### D. Parse API Errors into Structured Field-Level Feedback

```javascript
// utils/errorParser.js
export function parseApiError(error) {
  // Handle Pydantic 422 validation errors
  if (error.status === 422 && Array.isArray(error.details)) {
    const fieldErrors = {};
    error.details.forEach(err => {
      const fieldPath = err.loc?.slice(1).join('.') || 'unknown';
      fieldErrors[fieldPath] = humanizeValidationMessage(err.msg, err.type);
    });
    return { type: 'validation', fieldErrors, summary: null };
  }

  // Handle business logic errors
  if (error.status === 409) {
    return { type: 'conflict', fieldErrors: {}, summary: error.message };
  }

  // Generic server errors
  return { type: 'server', fieldErrors: {}, summary: error.message };
}

function humanizeValidationMessage(msg, type) {
  const humanMessages = {
    'value_error.missing': 'This field is required',
    'value_error.any_str.min_length': 'This field is too short',
    'type_error.integer': 'Please enter a valid number',
  };
  return humanMessages[type] || msg;
}
```

### WCAG Compliance Checklist

| Criterion | Status | Action |
|-----------|--------|--------|
| 1.4.3 Contrast (AA) | Partial | Error red (#DC2626) on white = 4.63:1 ✓. Ensure toast bg meets 4.5:1 |
| 1.3.1 Info & Relationships | Missing | Add `aria-invalid`, `aria-describedby` to all form fields |
| 4.1.3 Status Messages | Missing | Add `role="alert"` to toast container and error summaries |
| 3.3.1 Error Identification | Partial | Add field-level error display to all form sections |
| 3.3.3 Error Suggestion | Missing | Add humanized suggestions (e.g., "Date must be in YYYY-MM-DD format") |

### Testing Strategy

- **Axe/Lighthouse:** Run accessibility audit; target 0 ARIA violations
- **Screen reader testing:** VoiceOver (iOS) + NVDA (Windows) — verify errors are announced
- **Visual regression:** Percy snapshots of error states across breakpoints
- **UAT:** Users in Kaduna test error recovery flow on actual reports

---

## Challenge 3: Attachment Upload Failures

### Problem Analysis

**Current state:**

1. **No resumable uploads.** `client.js:172-192` uses a single `POST` with `multipart/form-data`. If the network drops mid-upload, the entire file must be re-sent. In rural Kaduna on 2G/3G, a 10MB voice note upload can take 3-5 minutes.

2. **Local filesystem storage.** Files go to `backend/uploads/` on disk (`config.py:27`). On Render's ephemeral filesystem, files are lost on every deploy or restart. This is a **critical data loss vector**.

3. **No offline attachment queuing.** `useOfflineQueue.js` serializes form data to localStorage, but `FormData` with `File` objects cannot be JSON-serialized. Binary attachments are silently dropped during offline queue.

4. **Mobile camera photos can be huge.** The Expo `ImagePicker` returns photos at native resolution (12+ MP = 5-15MB). No client-side compression before upload.

5. **Voice recording format issues.** `MediaRecorder` in `DynamicForm.jsx` and `VoiceRecorder.jsx` outputs `.webm` (Opus codec), which is not in the allowed backend list for all browsers. Safari outputs `.mp4` (AAC), which fails the extension check.

6. **No upload retry.** Failed uploads show a toast and require the user to manually re-attach and re-submit.

### Proposed Solution

#### A. Client-Side Compression and Validation

```javascript
// utils/fileProcessor.js
export async function processImage(file, maxWidth = 1920, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(maxWidth / img.width, 1);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
            type: 'image/jpeg',
          }));
        },
        'image/jpeg',
        quality
      );
    };
    img.src = URL.createObjectURL(file);
  });
}

export async function validateFile(file, options = {}) {
  const { maxSizeMB = 10, allowedTypes = [] } = options;
  const errors = [];

  if (file.size > maxSizeMB * 1024 * 1024) {
    errors.push(`File exceeds ${maxSizeMB}MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
  }

  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    errors.push(`Unsupported format: ${file.type}. Allowed: ${allowedTypes.join(', ')}`);
  }

  return errors;
}
```

#### B. Chunked/Resumable Upload

```javascript
// utils/chunkedUpload.js
const CHUNK_SIZE = 512 * 1024; // 512KB chunks for poor networks

export async function chunkedUpload(file, url, { onProgress, headers = {} }) {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const uploadId = crypto.randomUUID();

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('upload_id', uploadId);
    formData.append('chunk_index', i);
    formData.append('total_chunks', totalChunks);
    formData.append('filename', file.name);

    let retries = 3;
    while (retries > 0) {
      try {
        await apiClient.post(url, formData, {
          headers: { 'Content-Type': 'multipart/form-data', ...headers },
          timeout: 30000,
        });
        break;
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        await new Promise(r => setTimeout(r, 1000 * (3 - retries))); // backoff
      }
    }

    onProgress?.(Math.round(((i + 1) / totalChunks) * 100));
  }

  // Finalize: tell backend to assemble chunks
  const { data } = await apiClient.post(`${url}/finalize`, {
    upload_id: uploadId,
    filename: file.name,
    total_chunks: totalChunks,
  });

  return data;
}
```

#### C. Backend: Chunked Upload + Cloud Storage

```python
# backend/app/routers/uploads.py
import boto3
from fastapi import APIRouter, UploadFile, Form

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

# Use S3-compatible storage (AWS S3, Backblaze B2, or MinIO)
s3 = boto3.client('s3',
    endpoint_url=os.getenv("S3_ENDPOINT"),
    aws_access_key_id=os.getenv("S3_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("S3_SECRET_KEY"),
)
BUCKET = os.getenv("S3_BUCKET", "kadwdc-uploads")

@router.post("/chunk")
async def upload_chunk(
    chunk: UploadFile,
    upload_id: str = Form(...),
    chunk_index: int = Form(...),
    total_chunks: int = Form(...),
    filename: str = Form(...),
    current_user: User = Depends(get_current_user),
):
    """Receive a single chunk and store temporarily."""
    chunk_key = f"chunks/{upload_id}/{chunk_index:04d}"
    content = await chunk.read()
    s3.put_object(Bucket=BUCKET, Key=chunk_key, Body=content)
    return {"success": True, "chunk_index": chunk_index}


@router.post("/chunk/finalize")
async def finalize_upload(
    body: dict,
    current_user: User = Depends(get_current_user),
):
    """Assemble chunks into final file."""
    upload_id = body["upload_id"]
    filename = body["filename"]
    total_chunks = body["total_chunks"]

    # Concatenate chunks
    parts = []
    for i in range(total_chunks):
        chunk_key = f"chunks/{upload_id}/{i:04d}"
        obj = s3.get_object(Bucket=BUCKET, Key=chunk_key)
        parts.append(obj['Body'].read())
        s3.delete_object(Bucket=BUCKET, Key=chunk_key)

    # Store final file
    final_key = f"uploads/{current_user.id}/{upload_id}/{filename}"
    s3.put_object(Bucket=BUCKET, Key=final_key, Body=b''.join(parts))

    return {
        "success": True,
        "file_url": f"/api/uploads/{final_key}",
        "upload_id": upload_id,
    }
```

#### D. Offline Attachment Queuing with IndexedDB

```javascript
// utils/attachmentStore.js
import { openDB } from 'idb';

const DB_NAME = 'wdc-attachments';
const STORE_NAME = 'pending-files';

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    },
  });
}

export async function storeAttachmentOffline(file, metadata) {
  const db = await getDB();
  const buffer = await file.arrayBuffer();
  await db.put(STORE_NAME, {
    id: crypto.randomUUID(),
    buffer,
    name: file.name,
    type: file.type,
    size: file.size,
    metadata,
    createdAt: new Date().toISOString(),
  });
}

export async function getPendingAttachments() {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

export async function removePendingAttachment(id) {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}
```

### Edge Cases

| Scenario | Mitigation |
|----------|------------|
| Safari `.mp4` voice recordings | Accept `.mp4` in backend `ALLOWED_AUDIO_EXTENSIONS` + detect via MIME type, not just extension |
| 2G network, 10MB file | Chunked upload (512KB chunks) with per-chunk retry; progress bar shows real progress |
| localStorage quota exceeded by queued files | Use IndexedDB (typically 50MB-unlimited) instead of localStorage for binary data |
| Render ephemeral filesystem | Migrate to S3/Backblaze B2; files persist across deploys |
| Concurrent chunk uploads from same user | `upload_id` isolates each upload session |
| Photo from 48MP phone camera | Auto-compress to 1920px max dimension, JPEG 80% quality (~200-500KB) |

### Testing Strategy

- **Unit:** Test `processImage` output dimensions/size, `validateFile` rejection logic
- **Integration:** Simulate network interruption mid-chunk, verify resume from last successful chunk
- **Load test:** Concurrent 50-user upload test on staging (k6 or Artillery)
- **Device testing:** Samsung Galaxy A-series (common in Nigeria) + iPhone SE — verify camera capture + upload flow

---

## Challenge 4: Draft Saving

### Problem Analysis

**Current state — already partially implemented:**

The codebase has a solid foundation with `useLocalDraft.js` (localStorage, debounced save) and `useOfflineQueue.js` (queued submissions with idempotency). However, several gaps remain:

1. **Binary attachments not saved in drafts.** `useLocalDraft.js` serializes to JSON via `localStorage.setItem()`. `File` objects are not serializable — voice notes and photos attached to drafts are lost on page refresh.

2. **Draft restoration UX is invisible.** The draft auto-loads on mount (`useLocalDraft.js:168-182`) by merging into state, but users aren't explicitly asked "You have an unsaved draft from 2 hours ago — restore it?" This can cause confusion if old data appears unexpectedly.

3. **No conflict resolution.** If a user has a local draft AND a server draft (`/api/reports/draft/existing`), there's no merge strategy. The local draft silently wins.

4. **`DynamicForm.jsx` may not use `useLocalDraft`.** Need to verify — if the dynamic form renderer bypasses the draft hook, drafts are only saved for the static `WDCReportForm`.

5. **localStorage 5MB limit.** With large form JSON (action trackers, multiple sections), a single ward's draft can approach 100-500KB. With 23 LGAs × multiple wards, localStorage can fill up if a supervisor opens many reports.

### Proposed Solution

#### A. Draft Restoration Dialog

```jsx
// components/wdc/DraftRestoreDialog.jsx
const DraftRestoreDialog = ({ localDraft, serverDraft, onRestore, onDiscard, onMerge }) => {
  const localDate = localDraft?.savedAt ? new Date(localDraft.savedAt) : null;
  const serverDate = serverDraft?.updated_at ? new Date(serverDraft.updated_at) : null;

  // Determine which is newer
  const localIsNewer = localDate && serverDate ? localDate > serverDate : !!localDate;
  const hasConflict = localDraft && serverDraft;

  return (
    <Modal open={true} title="Unsaved Draft Found">
      <div className="space-y-4">
        <p className="text-gray-600">
          You have an unsaved draft for this report. What would you like to do?
        </p>

        {hasConflict && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
            <p className="font-medium text-amber-800">
              Both a local draft and a server draft exist.
            </p>
            <p className="text-amber-700 mt-1">
              Local: saved {formatRelativeTime(localDate)} •
              Server: saved {formatRelativeTime(serverDate)}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => onRestore(localIsNewer ? 'local' : 'server')}
            className="w-full"
          >
            Restore {localIsNewer ? 'local' : 'server'} draft
            ({localIsNewer ? 'most recent' : 'most recent'})
          </Button>

          {hasConflict && (
            <Button variant="outline" onClick={onMerge} className="w-full">
              Compare & merge both drafts
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={onDiscard}
            className="w-full text-red-600"
          >
            Discard draft and start fresh
          </Button>
        </div>
      </div>
    </Modal>
  );
};
```

#### B. IndexedDB for Large Drafts with Attachments

```javascript
// hooks/useIndexedDBDraft.js
import { openDB } from 'idb';

const DB_NAME = 'wdc-drafts';
const STORE = 'drafts';

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      const store = db.createObjectStore(STORE, { keyPath: 'key' });
      store.createIndex('userId', 'userId');
      store.createIndex('updatedAt', 'updatedAt');
    },
  });
}

export function useIndexedDBDraft({ userId, wardId, reportMonth }) {
  const key = `${userId}:${wardId}:${reportMonth}`;

  const saveDraft = useCallback(async (formData, attachments = []) => {
    const db = await getDB();
    await db.put(STORE, {
      key,
      userId,
      formData,
      attachments: await Promise.all(
        attachments.map(async (file) => ({
          name: file.name,
          type: file.type,
          buffer: await file.arrayBuffer(),
        }))
      ),
      updatedAt: new Date().toISOString(),
      version: 1,
    });
  }, [key, userId]);

  const loadDraft = useCallback(async () => {
    const db = await getDB();
    const draft = await db.get(STORE, key);
    if (!draft) return null;

    // Reconstruct File objects from ArrayBuffers
    const files = draft.attachments?.map(
      (a) => new File([a.buffer], a.name, { type: a.type })
    ) || [];

    return { formData: draft.formData, attachments: files, updatedAt: draft.updatedAt };
  }, [key]);

  const clearDraft = useCallback(async () => {
    const db = await getDB();
    await db.delete(STORE, key);
  }, [key]);

  return { saveDraft, loadDraft, clearDraft };
}
```

#### C. Conflict Resolution Strategy

```
Decision tree:
1. Only local draft exists → restore local
2. Only server draft exists → restore server
3. Both exist, timestamps within 5 minutes → use newer
4. Both exist, significant time gap → show dialog with options:
   a. Use local (offline edits)
   b. Use server (another device/session)
   c. Merge: take the union of filled fields, prefer newer for conflicts
```

#### D. Integration with DynamicForm

Ensure `DynamicForm.jsx` receives and uses the draft hook:

```jsx
// In SubmitReportPage.jsx
const draft = useLocalDraft({ userId, wardId, reportMonth, initialData });

// Pass to whichever form renders:
{activeForm ? (
  <DynamicForm
    formDefinition={activeForm}
    formData={draft.formData}
    onChange={draft.updateFormData}
    onSave={draft.forceSave}
  />
) : (
  <WDCReportForm
    formData={draft.formData}
    onChange={draft.updateFormData}
    onSave={draft.forceSave}
  />
)}
```

### Testing Strategy

- **Unit:** Draft save/load/clear round-trip; conflict resolution with various timestamp combos
- **Integration:** Fill form → close browser → reopen → verify all fields + attachments restored
- **Edge case:** Fill form on mobile, switch to desktop, verify server draft sync
- **Quota test:** Create 50 drafts in IndexedDB, measure storage usage, verify no quota errors

---

## Challenge 5: Offline Mode

### Problem Analysis

**Current state — partially implemented:**

The PWA already has a solid foundation:
- Workbox service worker with `navigateFallback`, `CacheFirst` for images, `NetworkFirst` for API (`vite.config.js:51-100`)
- `OfflineBanner.jsx` detects offline/online transitions
- `useOfflineQueue.js` queues report submissions
- `useLocalDraft.js` preserves form state

**Remaining gaps:**

1. **Offline form submission drops attachments.** The offline queue serializes to localStorage JSON — binary files can't be included.

2. **No read access to previously viewed reports offline.** The `NetworkFirst` cache has a 15-minute TTL and 8-second network timeout. If the user is offline for longer, cached API responses expire and pages show loading spinners indefinitely.

3. **No Background Sync API usage.** The service worker doesn't register `sync` events. The offline queue relies on `navigator.onLine` event (which fires when the browser thinks it's online, not when the server is actually reachable — common false positive on captive portals).

4. **Dashboard pages crash offline.** React Query retries once then shows an error. No cached fallback for dashboard stats when offline.

5. **User doesn't know what's available offline.** No indicator of "these reports are cached and viewable offline" vs "this page requires internet."

### Proposed Solution

#### A. Enhanced Service Worker with Background Sync

```javascript
// In vite.config.js, add to the VitePWA config:
workbox: {
  // ... existing config ...
  runtimeCaching: [
    // ... existing rules ...

    // Pre-cache form definitions so forms work offline
    {
      urlPattern: /\/api\/forms\/active/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'forms-cache',
        expiration: { maxEntries: 10, maxAgeSeconds: 24 * 60 * 60 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },

    // Cache user's own reports for offline viewing
    {
      urlPattern: /\/api\/reports\?/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'reports-cache',
        expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
  ],
}
```

#### B. Background Sync for Queued Submissions

```javascript
// frontend/src/sw-custom.js (injected into service worker)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reports') {
    event.waitUntil(syncQueuedReports());
  }
});

async function syncQueuedReports() {
  const queue = JSON.parse(
    await (await caches.open('offline-queue')).match('/queue-data')
      ?.then(r => r?.text()) || '[]'
  );

  for (const item of queue) {
    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${item.token}`,
          'Content-Type': 'application/json',
          'X-Submission-ID': item.id,
        },
        body: JSON.stringify(item.formData),
      });
      // Remove from queue on success
    } catch {
      // Will retry on next sync event
    }
  }
}
```

#### C. React Query Offline-Aware Configuration

```javascript
// In the QueryClient setup (main.jsx or App.jsx)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,

      // Offline-aware: don't retry when offline
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      networkMode: 'offlineFirst',  // ← Use cache if offline, don't throw

      // Show cached data while offline
      placeholderData: (previousData) => previousData,
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

// Wrap mutations with online-aware behavior:
// In useMutation for report submission:
const submitReport = useMutation({
  mutationFn: async (data) => {
    if (!navigator.onLine) {
      await addToQueue(data);
      return { queued: true };
    }
    return apiClient.post('/reports', data);
  },
  onSuccess: (result) => {
    if (result.queued) {
      toast.info('Report saved offline. It will sync when you reconnect.');
    } else {
      toast.success('Report submitted successfully!');
    }
  },
});
```

#### D. Offline Status Bar Enhancement

```jsx
// components/common/OfflineStatusBar.jsx
const OfflineStatusBar = () => {
  const { isOnline } = useOfflineQueue({});
  const [pendingCount, setPendingCount] = useState(0);

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`
      fixed bottom-0 left-0 right-0 z-40 px-4 py-2 text-sm font-medium
      flex items-center justify-between
      ${isOnline ? 'bg-blue-50 text-blue-800' : 'bg-amber-50 text-amber-800'}
      safe-area-bottom
    `}>
      <div className="flex items-center gap-2">
        {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
        <span>
          {isOnline
            ? `Syncing ${pendingCount} pending report(s)...`
            : 'You are offline. Changes are saved locally.'}
        </span>
      </div>
      {!isOnline && (
        <span className="text-xs text-amber-600">
          Reports will sync automatically when connected
        </span>
      )}
    </div>
  );
};
```

### Offline Capability Matrix

| Feature | Current | Target |
|---------|---------|--------|
| View dashboard | Fails | Show cached stats with "Last updated X ago" |
| Fill report form | Works (draft saves) | Works + save attachments to IndexedDB |
| Submit report | Queued (no attachments) | Queued with attachments via IndexedDB |
| View past reports | Fails after 15 min | Cached for 24 hours via StaleWhileRevalidate |
| Load form definitions | Fails | Cached for 24 hours |
| View notifications | Fails | Cached with offline indicator |
| Voice recording | Works | Works + stored in IndexedDB pending upload |

### Testing Strategy

- **Simulate offline:** Chrome DevTools → Network → Offline; verify all core flows work
- **Airplane mode test:** Real device testing on Samsung A-series (common in Kaduna)
- **Reconnection:** Go offline → fill form → go online → verify auto-sync + data integrity
- **Cache eviction:** Fill cache to capacity → verify LRU eviction doesn't lose critical data
- **Background sync:** Close browser while offline → reopen when online → verify queued submissions sent

---

## Challenge 6: Dashboard Stats Not Updating

### Problem Analysis

**Current state:**

1. **No real-time updates.** All dashboard data uses React Query `useQuery` with fixed `staleTime` values:
   - `useCheckSubmission`: 30 seconds
   - `useReports`: 1 minute
   - `useOverview`, `useTrends`: 1 minute

2. **`refetchOnWindowFocus: false` globally.** This was set in the QueryClient config — dashboards won't refresh even when the user tabs back to the app.

3. **No cross-page cache invalidation.** When a WDC Secretary submits a report, the State Dashboard doesn't know to refetch its analytics. Navigating between routes uses stale cached data.

4. **Manual refresh exists but is hidden.** The State Dashboard has a RefreshCw button, but WDC and LGA dashboards don't.

5. **No push-based updates.** No WebSocket or SSE connection — the server has no way to tell the client "new data is available."

### Proposed Solution

#### A. Smart Polling with Visibility-Aware Refetching

```javascript
// Update QueryClient defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,          // 1 min
      refetchOnWindowFocus: true,     // ← Enable
      refetchOnReconnect: true,       // ← Refetch when back online
      refetchInterval: false,         // Default off; enabled per-query
    },
  },
});

// Dashboard-specific queries get polling
// hooks/useWDCData.js
export const useSubmissionStatus = (reportMonth) => {
  return useQuery({
    queryKey: ['submission-status', reportMonth],
    queryFn: () => apiClient.get(`/reports/check-submission?month=${reportMonth}`),
    staleTime: 30 * 1000,
    refetchInterval: 2 * 60 * 1000,  // Poll every 2 minutes when tab is visible
    refetchIntervalInBackground: false, // Don't waste battery in background
  });
};

// State dashboard gets more frequent updates
export const useOverview = () => {
  return useQuery({
    queryKey: ['state-overview'],
    queryFn: () => apiClient.get('/analytics/overview'),
    staleTime: 60 * 1000,
    refetchInterval: 3 * 60 * 1000,  // Every 3 minutes
  });
};
```

#### B. Mutation-Triggered Cache Invalidation

```javascript
// When a report is submitted, invalidate all related caches
const submitReport = useMutation({
  mutationFn: (data) => apiClient.post('/reports', data),
  onSuccess: () => {
    // Invalidate everything that could be affected by a new report
    queryClient.invalidateQueries({ queryKey: ['submission-status'] });
    queryClient.invalidateQueries({ queryKey: ['reports'] });
    queryClient.invalidateQueries({ queryKey: ['state-overview'] });
    queryClient.invalidateQueries({ queryKey: ['lga-comparison'] });
    queryClient.invalidateQueries({ queryKey: ['trends'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  },
});

// When a report is reviewed/approved by LGA/State
const reviewReport = useMutation({
  mutationFn: ({ reportId, status }) =>
    apiClient.put(`/reports/${reportId}/review`, { status }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['reports'] });
    queryClient.invalidateQueries({ queryKey: ['state-overview'] });
  },
});
```

#### C. WebSocket for Real-Time (Phase 2)

For real-time updates when another user submits/reviews a report:

```python
# backend/app/routers/ws.py
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set

class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, Set[WebSocket]] = {}  # role -> connections

    async def connect(self, websocket: WebSocket, role: str):
        await websocket.accept()
        self.active.setdefault(role, set()).add(websocket)

    async def broadcast(self, role: str, message: dict):
        for ws in self.active.get(role, set()):
            try:
                await ws.send_json(message)
            except:
                self.active[role].discard(ws)

manager = ConnectionManager()

@router.websocket("/ws/dashboard/{role}")
async def dashboard_ws(websocket: WebSocket, role: str):
    user = await authenticate_ws(websocket)  # Verify JWT from query param
    if not user:
        await websocket.close(code=4001)
        return

    await manager.connect(websocket, role)
    try:
        while True:
            await websocket.receive_text()  # Keep alive
    except WebSocketDisconnect:
        manager.active.get(role, set()).discard(websocket)
```

```javascript
// Frontend: hooks/useDashboardSocket.js
export function useDashboardSocket(role) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const wsUrl = `${WS_BASE}/ws/dashboard/${role}?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data);

      if (type === 'report_submitted' || type === 'report_reviewed') {
        // Surgically invalidate affected queries
        queryClient.invalidateQueries({ queryKey: ['state-overview'] });
        queryClient.invalidateQueries({ queryKey: ['reports'] });
      }
    };

    ws.onclose = () => {
      // Reconnect with backoff
      setTimeout(() => { /* reconnect logic */ }, 3000);
    };

    return () => ws.close();
  }, [role, queryClient]);
}
```

#### D. Visual Freshness Indicator

```jsx
// components/common/DataFreshness.jsx
const DataFreshness = ({ dataUpdatedAt }) => {
  const age = Date.now() - dataUpdatedAt;
  const isStale = age > 5 * 60 * 1000; // > 5 minutes

  return (
    <span className={`text-xs ${isStale ? 'text-amber-600' : 'text-gray-400'}`}>
      {isStale && <AlertCircle size={12} className="inline mr-1" />}
      Updated {formatRelativeTime(dataUpdatedAt)}
    </span>
  );
};

// Usage in dashboard cards:
<Card>
  <CardHeader className="flex justify-between">
    <h3>Reports This Month</h3>
    <DataFreshness dataUpdatedAt={query.dataUpdatedAt} />
  </CardHeader>
  <CardBody>{query.data?.total || 0}</CardBody>
</Card>
```

### Implementation Phases

| Phase | Scope | Effort |
|-------|-------|--------|
| 1 (Quick) | Enable `refetchOnWindowFocus`, add mutation invalidation, add refresh button to all dashboards | Low (2-3 hours) |
| 2 (Medium) | Add polling intervals per query, visibility-aware refetching, freshness indicators | Medium (1-2 days) |
| 3 (Advanced) | WebSocket integration for real-time push updates | High (3-5 days) |

### Testing Strategy

- **Integration:** Submit report as WDC user → verify State Dashboard updates within polling interval
- **Visual:** Stale data shows amber "Updated 5 minutes ago" indicator
- **WebSocket:** Test reconnection after network drop; verify no message loss
- **Performance:** Verify polling doesn't cause excessive API calls (monitor with React Query DevTools)

---

## Challenge 7: KoboCollect-Style Wizard Form

### Problem Analysis

**Current state:**

1. **WDCReportForm.jsx is a single 84KB monolith** with all sections visible as collapsible accordions. Users must scroll through the entire form, which is overwhelming on mobile.

2. **DynamicForm.jsx** renders all fields in a single page too, with sections as visual dividers but no step-by-step navigation.

3. **No progress indicator** showing how far through the form the user is.

4. **No per-section validation** — validation only runs on final submission, so users discover errors late.

5. **Mobile UX is poor** — the long scrollable form is not optimized for thumb-zone navigation on phones.

### Proposed Solution: Multi-Step Wizard Form

#### A. Wizard Architecture

```
┌─────────────────────────────────────────┐
│  Progress Bar: ████████░░░░░░ Step 3/8  │
├─────────────────────────────────────────┤
│                                         │
│  Section Title: "Meeting Details"       │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Meeting Date                     │    │
│  │ [  2026-02-15  ]               │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Number of Attendees              │    │
│  │ [  45  ]                        │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Meeting Location                 │    │
│  │ [  Ward Hall, Kaduna South  ]   │    │
│  └─────────────────────────────────┘    │
│                                         │
├─────────────────────────────────────────┤
│  [← Back]              [Next →]         │
│                  or                     │
│           [Save as Draft]               │
└─────────────────────────────────────────┘
```

#### B. FormWizard Component

```jsx
// components/wdc/FormWizard.jsx
import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FormWizard = ({
  sections,        // Array of { id, title, icon, fields, validate }
  formData,
  onChange,
  onSubmit,
  onSaveDraft,
  draftStatus,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const [stepErrors, setStepErrors] = useState({});
  const [visitedSteps, setVisitedSteps] = useState(new Set([0]));

  const totalSteps = sections.length;
  const currentSection = sections[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Validate current step before advancing
  const validateCurrentStep = useCallback(() => {
    if (!currentSection.validate) return true;
    const errors = currentSection.validate(formData);
    if (Object.keys(errors).length > 0) {
      setStepErrors((prev) => ({ ...prev, [currentStep]: errors }));
      return false;
    }
    setStepErrors((prev) => {
      const next = { ...prev };
      delete next[currentStep];
      return next;
    });
    return true;
  }, [currentSection, formData, currentStep]);

  const goNext = useCallback(() => {
    if (!validateCurrentStep()) return;
    setDirection(1);
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
    setVisitedSteps((prev) => new Set([...prev, currentStep + 1]));
  }, [validateCurrentStep, totalSteps, currentStep]);

  const goBack = useCallback(() => {
    setDirection(-1);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const goToStep = useCallback((step) => {
    if (!visitedSteps.has(step) && step > currentStep) return; // Can't skip ahead
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  }, [visitedSteps, currentStep]);

  // Slide animation variants
  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <span className="text-sm text-gray-500">{Math.round(progress)}% complete</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-green-600 rounded-full"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          />
        </div>

        {/* Step indicators */}
        <div className="flex justify-between mt-3">
          {sections.map((section, idx) => (
            <button
              key={section.id}
              onClick={() => goToStep(idx)}
              disabled={!visitedSteps.has(idx) && idx > currentStep}
              className={`
                flex flex-col items-center gap-1 text-xs transition-colors
                ${idx === currentStep
                  ? 'text-green-700 font-semibold'
                  : visitedSteps.has(idx)
                    ? 'text-green-600 cursor-pointer hover:text-green-700'
                    : 'text-gray-300 cursor-not-allowed'}
              `}
            >
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                transition-all duration-200
                ${idx === currentStep
                  ? 'bg-green-600 text-white ring-4 ring-green-100'
                  : idx < currentStep || visitedSteps.has(idx)
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-400'}
                ${stepErrors[idx] ? 'ring-2 ring-red-400' : ''}
              `}>
                {idx < currentStep && visitedSteps.has(idx) ? '✓' : idx + 1}
              </div>
              <span className="hidden sm:inline max-w-[60px] truncate">
                {section.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Section Content with Slide Animation */}
      <div className="relative overflow-hidden min-h-[400px]">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="w-full"
          >
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                {currentSection.icon && (
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <currentSection.icon className="text-green-600" size={20} />
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {currentSection.title}
                  </h2>
                  {currentSection.description && (
                    <p className="text-sm text-gray-500">{currentSection.description}</p>
                  )}
                </div>
              </div>

              {/* Render section fields */}
              <div className="space-y-5">
                {currentSection.renderFields({
                  formData,
                  onChange,
                  errors: stepErrors[currentStep] || {},
                })}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={goBack}
          disabled={isFirstStep}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium
            transition-all duration-200
            ${isFirstStep
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}
          `}
        >
          <ChevronLeft size={18} />
          Back
        </button>

        <button
          onClick={onSaveDraft}
          className="px-4 py-2 text-sm text-green-700 hover:bg-green-50 rounded-lg
                     transition-colors flex items-center gap-1.5"
        >
          <Save size={14} />
          {draftStatus === 'saving' ? 'Saving...' : 'Save Draft'}
        </button>

        {isLastStep ? (
          <button
            onClick={onSubmit}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium
                       bg-green-600 text-white hover:bg-green-700 active:bg-green-800
                       transition-all duration-200 shadow-sm"
          >
            Submit Report
            <Send size={16} />
          </button>
        ) : (
          <button
            onClick={goNext}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium
                       bg-green-600 text-white hover:bg-green-700 active:bg-green-800
                       transition-all duration-200 shadow-sm"
          >
            Next
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {/* Keyboard navigation hint (desktop only) */}
      <p className="hidden md:block text-center text-xs text-gray-400 mt-3">
        Press Enter to advance, Escape to go back
      </p>
    </div>
  );
};
```

#### C. Section Definitions for WDC Report

```jsx
// config/reportSections.js
import {
  CalendarDays, Users, ListTodo, Briefcase,
  Gift, Wrench, Megaphone, Crown, AlertTriangle, FileText
} from 'lucide-react';

export const WDC_REPORT_SECTIONS = [
  {
    id: 'meeting',
    title: 'Meeting Details',
    description: 'Basic information about the WDC meeting',
    icon: CalendarDays,
    fields: ['meeting_date', 'meeting_location', 'attendees_count', 'agenda_summary'],
    validate: (data) => {
      const errors = {};
      if (!data.meeting_date) errors.meeting_date = 'Meeting date is required';
      if (!data.attendees_count || data.attendees_count < 1)
        errors.attendees_count = 'At least 1 attendee is required';
      return errors;
    },
  },
  {
    id: 'agenda',
    title: 'Agenda Items',
    description: 'What was discussed in the meeting',
    icon: ListTodo,
    fields: ['agenda_items'],
    validate: (data) => {
      const errors = {};
      if (!data.agenda_items?.length)
        errors.agenda_items = 'At least one agenda item is required';
      return errors;
    },
  },
  {
    id: 'action_tracker',
    title: 'Action Tracker',
    description: 'Actions decided and their progress',
    icon: Briefcase,
    fields: ['action_tracker'],
    validate: () => ({}), // Optional section
  },
  {
    id: 'staff',
    title: 'Staff Information',
    description: 'PHC staff and community health workers',
    icon: Users,
    fields: ['staff_count', 'chew_count', 'volunteer_count'],
    validate: () => ({}),
  },
  {
    id: 'donations',
    title: 'Donations & Support',
    description: 'Donations received from organizations',
    icon: Gift,
    fields: ['donations'],
    validate: () => ({}),
  },
  {
    id: 'repairs',
    title: 'Facility Repairs',
    description: 'Repairs and maintenance activities',
    icon: Wrench,
    fields: ['repairs'],
    validate: () => ({}),
  },
  {
    id: 'awareness',
    title: 'Awareness Campaigns',
    description: 'Community awareness and sensitization',
    icon: Megaphone,
    fields: ['awareness_campaigns'],
    validate: () => ({}),
  },
  {
    id: 'leadership',
    title: 'Traditional/Religious Support',
    description: 'Support from traditional and religious leaders',
    icon: Crown,
    fields: ['traditional_support', 'religious_support'],
    validate: () => ({}),
  },
  {
    id: 'challenges',
    title: 'Challenges & AOB',
    description: 'Issues encountered and any other business',
    icon: AlertTriangle,
    fields: ['challenges', 'aob'],
    validate: () => ({}),
  },
  {
    id: 'attachments',
    title: 'Voice Notes & Photos',
    description: 'Attach supporting media files',
    icon: FileText,
    fields: ['voice_notes', 'photos'],
    validate: () => ({}),
  },
];
```

#### D. DynamicForm Wizard Adapter

For forms created via the Form Builder, auto-generate wizard steps from sections:

```jsx
// components/wdc/DynamicFormWizard.jsx
const DynamicFormWizard = ({ formDefinition, formData, onChange, onSubmit, onSaveDraft }) => {
  // Convert form definition sections into wizard steps
  const sections = useMemo(() => {
    return formDefinition.sections.map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description,
      icon: null, // Dynamic forms don't have predefined icons
      renderFields: ({ formData, onChange, errors }) => (
        <DynamicFieldGroup
          fields={section.fields}
          formDefinition={formDefinition}
          formData={formData}
          onChange={onChange}
          errors={errors}
        />
      ),
      validate: (data) => {
        const errors = {};
        section.fields.forEach((field) => {
          if (field.required && !data[field.name]) {
            errors[field.name] = `${field.label} is required`;
          }
        });
        return errors;
      },
    }));
  }, [formDefinition]);

  return (
    <FormWizard
      sections={sections}
      formData={formData}
      onChange={onChange}
      onSubmit={onSubmit}
      onSaveDraft={onSaveDraft}
    />
  );
};
```

#### E. Mobile-Optimized Touch Interactions

```css
/* Tailwind utilities for mobile wizard */
@layer components {
  /* Large touch targets (48px minimum per WCAG) */
  .wizard-nav-btn {
    @apply min-h-[48px] min-w-[48px] touch-manipulation;
  }

  /* Swipe gesture support */
  .wizard-content {
    @apply touch-pan-y;
  }

  /* Safe area padding for phones with notch/gesture bar */
  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom, 0);
  }
}
```

Add swipe gesture support:

```javascript
// hooks/useSwipeNavigation.js
export function useSwipeNavigation({ onSwipeLeft, onSwipeRight }) {
  const touchStartRef = useRef({ x: 0, y: 0 });

  const handleTouchStart = useCallback((e) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }, []);

  const handleTouchEnd = useCallback((e) => {
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;

    // Only trigger if horizontal swipe > 80px and mostly horizontal
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 2) {
      if (dx > 0) onSwipeRight?.();
      else onSwipeLeft?.();
    }
  }, [onSwipeLeft, onSwipeRight]);

  return { onTouchStart: handleTouchStart, onTouchEnd: handleTouchEnd };
}
```

### Testing Strategy

- **Visual regression:** Percy snapshots of each wizard step across mobile/tablet/desktop
- **Navigation:** Test all step transitions, back/forward, jump-to-step, keyboard navigation
- **Validation:** Verify per-step validation blocks "Next" with clear error messages
- **Draft integration:** Fill 3 steps → close → reopen → verify wizard resumes at correct step
- **Accessibility:** Tab navigation through all fields, screen reader announces step changes
- **Performance:** Verify animation runs at 60fps on mid-range Android devices

---

## Holistic Integration Map

```
                    ┌──────────────────┐
                    │  Service Worker   │
                    │  (Workbox PWA)    │
                    └────────┬─────────┘
                             │ caches assets + API
                             │
┌─────────────┐    ┌────────┴─────────┐    ┌──────────────┐
│ JWT Refresh  │    │  Form Wizard     │    │  Dashboard   │
│ Token Flow   │    │  (KoboCollect)   │    │  WebSocket   │
│ (Challenge 1)│    │  (Challenge 7)   │    │  (Challenge 6)│
└──────┬──────┘    └────────┬─────────┘    └──────┬───────┘
       │                    │                      │
       │         ┌──────────┴──────────┐           │
       │         │   Auto-Save Draft   │           │
       │         │   (Challenge 4)     │           │
       │         │  localStorage +     │           │
       │         │  IndexedDB          │           │
       │         └──────────┬──────────┘           │
       │                    │                      │
       │         ┌──────────┴──────────┐           │
       │         │  Offline Queue      │           │
       │         │  (Challenge 5)      │           │
       │         │  + Background Sync  │           │
       │         └──────────┬──────────┘           │
       │                    │                      │
       │         ┌──────────┴──────────┐           │
       │         │  Attachment Store   │           │
       │         │  (Challenge 3)      │           │
       │         │  IndexedDB + S3     │           │
       │         └──────────┬──────────┘           │
       │                    │                      │
       └────────────────────┼──────────────────────┘
                            │
                 ┌──────────┴──────────┐
                 │  Error Handling UI  │
                 │  (Challenge 2)      │
                 │  ARIA + Toasts +    │
                 │  Inline Validation  │
                 └─────────────────────┘
```

**Key synergies:**
- Draft saving (4) + Offline mode (5): drafts persist both locally AND sync when online
- Auto log-out fix (1) + Draft saving (4): even if session expires, draft is preserved
- Wizard form (7) + Draft saving (4): wizard remembers which step the user was on
- Attachment uploads (3) + Offline mode (5): IndexedDB stores binary files for later upload
- Error visibility (2) + Wizard form (7): per-step validation with clear inline errors
- Dashboard updates (6) + Offline mode (5): show stale data with freshness indicator when offline

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2) — Critical Data Loss Prevention
| Task | Challenge | Effort |
|------|-----------|--------|
| Add JWT refresh token endpoint + client interceptor | 1 | Medium |
| Upgrade draft system to IndexedDB (preserve attachments) | 4 | Medium |
| Add draft restore dialog with conflict resolution | 4 | Low |
| Make error toasts persistent + add ARIA attributes | 2 | Low |

### Phase 2: Reliability (Weeks 3-4) — Upload & Offline
| Task | Challenge | Effort |
|------|-----------|--------|
| Client-side image compression | 3 | Low |
| Chunked upload with per-chunk retry | 3 | High |
| Migrate file storage to S3/Backblaze B2 | 3 | Medium |
| Enhanced service worker caching strategies | 5 | Medium |
| Background Sync registration | 5 | Medium |
| React Query `networkMode: 'offlineFirst'` | 5 | Low |

### Phase 3: UX Enhancement (Weeks 5-7) — Dashboard & Form
| Task | Challenge | Effort |
|------|-----------|--------|
| Enable `refetchOnWindowFocus` + mutation invalidation | 6 | Low |
| Add polling intervals + freshness indicators | 6 | Medium |
| Build `FormWizard` component with animations | 7 | High |
| Adapt `WDCReportForm` sections for wizard | 7 | High |
| Adapt `DynamicForm` for wizard mode | 7 | Medium |
| Swipe navigation + keyboard shortcuts | 7 | Low |

### Phase 4: Advanced (Weeks 8+) — Real-Time & Polish
| Task | Challenge | Effort |
|------|-----------|--------|
| WebSocket server + client for dashboard updates | 6 | High |
| Full WCAG AA compliance audit + fixes | 2 | Medium |
| Structured API error parsing + field-level feedback | 2 | Medium |
| Cross-browser testing (Safari voice recording fix) | 3 | Low |
| Performance optimization pass (Lighthouse 90+) | All | Medium |

---

## Monitoring & Success Metrics

| Metric | Tool | Target |
|--------|------|--------|
| Session expiry interruptions | Sentry custom event | < 1% of active sessions |
| Form submission error rate | Sentry + backend logs | < 2% of attempts |
| Upload success rate | S3 metrics + Sentry | > 98% |
| Draft restoration rate | Custom analytics event | > 95% of interrupted sessions |
| Offline submission sync success | Background sync logs | > 99% within 24h |
| Dashboard data staleness | React Query DevTools | < 3 min avg in production |
| Form completion rate | Analytics funnel | > 80% (up from current) |
| Lighthouse PWA score | CI/CD integration | > 90 |
| WCAG violations | axe-core in CI | 0 critical, 0 serious |

---

## Dependencies to Install

```bash
# Frontend
npm install idb               # IndexedDB wrapper for drafts + attachments
npm install framer-motion      # Wizard step animations (already may be installed)

# Backend (only if adding S3)
pip install boto3              # S3-compatible storage client

# Dev/Testing
npm install -D @axe-core/react # Accessibility testing
npm install -D msw             # Service worker mocking for offline tests
```

No other new frameworks needed — the existing stack (React, Tailwind, React Query, Workbox) handles everything.
