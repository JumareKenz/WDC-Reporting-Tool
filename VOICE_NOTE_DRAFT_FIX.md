# Voice Note Draft Persistence - Implementation Summary

## Problem Statement
Voice notes recorded in the WDC Report Form were **not being preserved as drafts**. When users:
1. Recorded a voice note
2. Closed/navigated away from the form (without submitting)
3. Returned to the form later

The voice notes would be **lost**, while text fields were correctly restored from drafts.

## Root Cause Analysis
1. **Voice notes stored only in React state**: The `voiceNotes` state in `SubmitReportPage.jsx` was ephemeral
2. **Draft serialization excluded binary data**: The `serializableFormData()` function filtered out non-serializable data
3. **VoiceRecorder component was stateless**: Recordings existed only in component-local state
4. **No IndexedDB integration for voice**: While `voiceNoteStorage.js` existed, it was only for offline queueing (post-recording), not draft persistence

## Solution Architecture

### Storage Strategy: IndexedDB
- **Why IndexedDB**: Native Blob support, large quotas (50MB+), async API, excellent browser support (2025-2026)
- **Not localStorage**: Cannot store Blobs directly, base64 encoding causes bloat and quota issues
- **Not OPFS**: Good for files but overkill; IndexedDB is simpler for this use case

### Data Structure
```typescript
interface VoiceNoteDraft {
  key: string;                    // Composite: `${userId}:${wardId}:${reportMonth}:${fieldName}`
  draftKey: string;               // Parent key: `${userId}:${wardId}:${reportMonth}`
  userId: string;
  wardId: string;
  reportMonth: string;            // YYYY-MM
  fieldName: string;
  blob: Blob;                     // The audio data
  mimeType: string;               // audio/webm, audio/mp4, etc.
  duration: number;               // Recording duration in seconds
  createdAt: string;              // ISO timestamp
}
```

## Files Changed

### 1. New File: `frontend/src/hooks/useVoiceNoteDraft.js`
A new hook that manages voice note persistence with IndexedDB:
- `saveVoiceNote(fieldName, blob, mimeType, duration)` - Persist a voice note
- `removeVoiceNote(fieldName)` - Delete a specific voice note
- `clearAllVoiceNotes()` - Delete all voice notes for current draft context
- `loadVoiceNoteDrafts()` - Load all voice notes for current context
- `voiceNotes` - State containing all restored voice notes with object URLs

### 2. Modified: `frontend/src/components/wdc/VoiceRecorder.jsx`
- Added `draftContext` prop to receive `{ userId, wardId, reportMonth }`
- Added `autoSaveDraft` prop (default: true)
- On recording stop: Automatically saves to IndexedDB via `useVoiceNoteDraft`
- On mount: Restores draft voice note if available
- Shows "Restored" badge for draft recordings
- On delete: Removes from both state and IndexedDB

### 3. Modified: `frontend/src/pages/SubmitReportPage.jsx`
- Integrated `useVoiceNoteDraft` hook
- On voice note capture: Saves to IndexedDB via `saveVoiceNote()`
- On draft load: Restores voice notes from IndexedDB into form state
- On successful submission: Clears voice note drafts via `clearAllVoiceNotes()`

### 4. Modified: `frontend/src/components/wdc/WDCReportWizard.jsx`
- Added `draftContext` prop
- Passes `draftContext` to all section components

### 5. Modified: Section Components (all updated to pass `draftContext`)
- `ActionTrackerSection.jsx`
- `ActionPlanSection.jsx`
- `CommunityFeedbackSection.jsx`
- `VDCReportsSection.jsx`
- `CMPDSRSection.jsx`
- `ConclusionSection.jsx`
- `FacilitySupportSection.jsx`
- `MobilizationSection.jsx`
- `shared.jsx` (TextInput component)

## User Flow After Fix

### Recording & Leaving
1. User records voice note for "Action Plan" field
2. VoiceRecorder saves blob to IndexedDB immediately on stop
3. User closes browser/tab
4. Form text data saves to localStorage (existing behavior)
5. Voice note data remains in IndexedDB

### Returning to Form
1. User reopens form for same month/ward
2. `useVoiceNoteDraft` loads voice notes from IndexedDB
3. Voice notes restored as File objects in `voiceNotes` state
4. VoiceRecorder displays "Restored" badge with audio player
5. User can play, re-record, or delete the draft voice note

### Submission
1. User submits form
2. On success: `clearAllVoiceNotes()` removes all draft voice notes
3. Voice notes are uploaded with the form submission
4. IndexedDB is cleaned up

## Testing Checklist

### Basic Functionality
- [ ] Record voice note → Stop → Voice note appears with player
- [ ] Refresh page → Voice note is restored with "Restored" badge
- [ ] Close tab → Reopen → Voice note is restored
- [ ] Delete voice note → Refresh → Voice note stays deleted
- [ ] Submit form → Voice notes uploaded → Drafts cleared

### Multiple Voice Notes
- [ ] Record voice notes in multiple fields (Action Plan, Community Feedback, etc.)
- [ ] All voice notes restore correctly after refresh
- [ ] Deleting one doesn't affect others

### Edge Cases
- [ ] Start recording → Close tab mid-recording → Should handle gracefully
- [ ] Record very long voice note (>1 minute) → Should save and restore
- [ ] Record on mobile → Background app → Return → Voice note preserved
- [ ] iOS Safari: Recording works and restores (MIME type: audio/mp4)
- [ ] Chrome/Edge: Recording works and restores (MIME type: audio/webm)
- [ ] Offline mode: Voice notes save locally, upload when online

### Draft Lifecycle
- [ ] Create draft with voice notes → Submit → Draft cleared
- [ ] Create draft with voice notes → Cancel → Draft preserved for return
- [ ] Switch months → Each month has separate voice note drafts
- [ ] Different users on same device → Drafts are isolated by userId

### Error Handling
- [ ] IndexedDB quota exceeded → Graceful degradation
- [ ] Corrupted draft in IndexedDB → Skips that voice note, continues
- [ ] Browser doesn't support MediaRecorder → Shows helpful error

## Browser Compatibility

| Browser | Recording | Draft Persistence | Notes |
|---------|-----------|-------------------|-------|
| Chrome 90+ | ✅ | ✅ | audio/webm |
| Edge 90+ | ✅ | ✅ | audio/webm |
| Firefox 88+ | ✅ | ✅ | audio/ogg or audio/webm |
| Safari 14.1+ | ✅ | ✅ | audio/mp4 |
| iOS Safari 14.5+ | ✅ | ✅ | audio/mp4 |
| Android Chrome | ✅ | ✅ | audio/webm |

## Performance Considerations

1. **Object URL Management**: Created URLs are revoked on:
   - Component unmount
   - Recording deletion
   - New recording (replaces old)

2. **Memory Usage**: 
   - Blobs stored in IndexedDB (disk, not memory)
   - Only active recordings have object URLs in memory
   - Automatic cleanup prevents leaks

3. **Storage Quota**:
   - IndexedDB typically allows 50-200MB per origin
   - Voice notes are compressed (Opus/AAC)
   - ~3 minutes = ~500KB typical size

## Dependencies
- `idb` - Already in project for IndexedDB abstraction
- No new dependencies added

## Security Considerations
1. Voice notes are stored in **Origin Private** IndexedDB
2. Data is scoped to:
   - User ID (prevents cross-user access on shared device)
   - Ward ID
   - Report Month
3. Cleared after successful submission
4. No server upload until explicit submit

## Migration Notes
- No migration needed - this is a new feature
- Old `voiceNoteStorage.js` remains for offline queueing (different use case)
- New store `wdc-voice-note-drafts` is separate from existing stores

## Future Enhancements (Optional)
1. **Compression**: Compress audio before storage to save space
2. **OPFS**: For very large recordings, use Origin Private File System
3. **Sync**: Sync voice note drafts across devices via server
4. **Transcription**: Auto-transcribe and store text alongside audio
