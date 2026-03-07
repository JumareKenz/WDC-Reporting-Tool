import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Play, Pause, Trash2, Check, Loader2, RotateCcw } from 'lucide-react';
import { useVoiceNoteDraft } from '../../hooks/useVoiceNoteDraft';

/**
 * WhatsApp-style Voice Recorder Component with Draft Persistence
 * 
 * Can be attached to any form field for voice input.
 * Voice recordings are automatically saved to IndexedDB and restored
 * when the user returns to the form.
 * 
 * Props:
 * - fieldName: string (required) - Field identifier
 * - onRecordingComplete: function(file) - Called when recording completes (optional)
 * - onRecordingDelete: function() - Called when recording is deleted (optional)
 * - disabled: boolean - Disable interactions
 * - compact: boolean - Use compact inline style
 * - existingRecording: File/Blob - Pre-existing recording to display
 * - draftContext: { userId, wardId, reportMonth } - Context for draft persistence
 * - autoSaveDraft: boolean - Whether to auto-save to IndexedDB (default: true)
 */
const VoiceRecorder = ({
  fieldName,
  onRecordingComplete,
  onRecordingDelete,
  disabled = false,
  compact = false,
  existingRecording = null,
  draftContext = null, // { userId, wardId, reportMonth }
  autoSaveDraft = true,
}) => {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(existingRecording);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRestored, setIsRestored] = useState(false);

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const streamRef = useRef(null);
  const hasPersistedRef = useRef(false);
  const deletedRef = useRef(false);

  // Draft persistence hook
  const {
    saveVoiceNote,
    removeVoiceNote,
    getVoiceNote,
    isInitialized: draftInitialized,
  } = useVoiceNoteDraft({
    userId: draftContext?.userId,
    wardId: draftContext?.wardId,
    reportMonth: draftContext?.reportMonth,
    enabled: autoSaveDraft && !!draftContext?.userId && !!draftContext?.wardId && !!draftContext?.reportMonth,
  });

  /**
   * Sync existingRecording prop to state (for parent-passed recordings).
   * Skip if user just deleted — deletedRef prevents the old prop from restoring.
   */
  useEffect(() => {
    // Once the parent confirms the clear (existingRecording becomes null), reset the guard
    if (!existingRecording) {
      deletedRef.current = false;
      return;
    }
    if (deletedRef.current) return;
    if (existingRecording instanceof Blob && !audioBlob) {
      setAudioBlob(existingRecording);
      if (process.env.NODE_ENV === 'development') {
        console.log('[VoiceRecorder] Synced existingRecording for:', fieldName);
      }
    }
  }, [existingRecording, audioBlob, fieldName]);

  /**
   * Try to restore draft voice note on mount
   */
  useEffect(() => {
    if (!draftInitialized || !autoSaveDraft || !draftContext) return;
    if (existingRecording || audioBlob || hasPersistedRef.current) return;

    const restored = getVoiceNote(fieldName);
    if (restored?.blob) {
      setAudioBlob(restored.blob);
      setAudioUrl(restored.url);
      setRecordingTime(restored.duration || 0);
      setIsRestored(true);
      
      // Notify parent of restored recording
      const file = new File([restored.blob], `voice_${fieldName}_${Date.now()}.webm`, {
        type: restored.mimeType || 'audio/webm',
      });
      onRecordingComplete?.(file);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[VoiceRecorder] Restored draft for:', fieldName);
      }
    }
  }, [draftInitialized, autoSaveDraft, draftContext, fieldName, existingRecording, audioBlob, getVoiceNote, onRecordingComplete]);

  /**
   * Create audio URL when blob changes (for non-draft blobs)
   * URL cleanup is handled by deleteRecording and the unmount effect.
   */
  useEffect(() => {
    if (audioBlob && !audioUrl) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
    }
  }, [audioBlob, audioUrl]);

  /**
   * Handle page visibility change (mobile backgrounding)
   * Auto-stop and save recording when user switches apps/tabs
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isRecording) {
        // Auto-stop and save when tab is hidden
        stopRecording();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRecording]);

  /**
   * Handle beforeunload - warn if recording in progress
   */
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isRecording) {
        // This may not always show in modern browsers, but we try
        e.preventDefault();
        e.returnValue = 'Recording in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRecording]);

  /**
   * Cleanup on unmount - stop recording if in progress
   */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioUrl && !isRestored) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl, isRestored]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Persist recording to IndexedDB
   */
  const persistRecording = useCallback(async (blob, duration) => {
    if (!autoSaveDraft || !draftContext || hasPersistedRef.current) return;
    
    setIsSaving(true);
    try {
      const success = await saveVoiceNote(
        fieldName,
        blob,
        blob.type || 'audio/webm',
        duration
      );
      if (success) {
        hasPersistedRef.current = true;
      }
    } finally {
      setIsSaving(false);
    }
  }, [autoSaveDraft, draftContext, fieldName, saveVoiceNote]);

  const startRecording = async () => {
    setError(null);
    setIsRestored(false);
    hasPersistedRef.current = false;
    deletedRef.current = false;
    
    try {
      // Check for MediaRecorder support
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Determine supported MIME type (Safari-friendly)
      const mimeType = getSupportedMimeType();

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);

        // Create file for form submission
        const file = new File([blob], `voice_${fieldName}_${Date.now()}.${getExtensionFromMime(mimeType)}`, {
          type: mimeType,
        });
        
        // Notify parent
        onRecordingComplete?.(file);

        // Persist to IndexedDB for draft
        persistRecording(blob, recordingTime);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording failed. Please try again.');
        setIsRecording(false);
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else if (err.message.includes('MediaRecorder')) {
        setError('Voice recording is not supported in this browser. Please try Chrome, Safari, or Firefox.');
      } else {
        setError('Could not access microphone. Please try again.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const deleteRecording = async () => {
    // Revoke URL if it's a local blob (not from draft)
    if (audioUrl && !isRestored) {
      URL.revokeObjectURL(audioUrl);
    }

    deletedRef.current = true;
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsRestored(false);
    hasPersistedRef.current = false;

    // Remove from IndexedDB
    if (autoSaveDraft && draftContext) {
      await removeVoiceNote(fieldName);
    }

    // Notify parent to clear the file from its state.
    // This is critical — without it, the parent still holds the file
    // in voiceNotes[fieldName] and passes it back as existingRecording,
    // causing the sync effect to immediately restore the deleted blob.
    onRecordingComplete?.(null);
    onRecordingDelete?.();
  };

  // Compact inline style for form fields
  if (compact) {
    // No recording yet — show mic button
    if (!audioBlob) {
      return (
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled || isSaving}
            className={`
              p-1.5 rounded-full transition-all duration-200
              ${isRecording
                ? 'bg-red-500 text-white animate-pulse hover:bg-red-600'
                : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            title={isRecording ? 'Stop recording' : 'Record voice note'}
          >
            {isRecording ? (
              <Square className="w-4 h-4" />
            ) : isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>
          {isRecording && (
            <span className="text-xs text-red-500 font-medium animate-pulse">
              {formatTime(recordingTime)}
            </span>
          )}
          {error && (
            <span className="text-xs text-red-500" title={error}>
              ⚠️
            </span>
          )}
        </div>
      );
    }

    // Recording exists — show visible player
    return (
      <div className="flex items-center gap-2 mt-1 p-2 bg-green-50 rounded-lg border border-green-200">
        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
        <span className="text-xs text-green-700 font-medium">
          {isRestored ? 'Restored' : 'Recorded'}
        </span>
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            className="h-8 flex-1 min-w-0"
            preload="metadata"
            onEnded={handleAudioEnded}
          />
        )}
        <button
          type="button"
          onClick={deleteRecording}
          disabled={disabled}
          className="p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors flex-shrink-0"
          title="Delete recording"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Full-size component
  return (
    <div className="space-y-2">
      {error && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg flex items-start gap-2">
          <span className="flex-shrink-0">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {!audioBlob ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled || isSaving}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-200
              ${isRecording
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse'
                : 'bg-primary-600 text-white hover:bg-primary-700 shadow-md hover:shadow-lg'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isRecording ? (
              <>
                <Square className="w-4 h-4" />
                <span>Stop ({formatTime(recordingTime)})</span>
              </>
            ) : isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Record Voice Note</span>
              </>
            )}
          </button>

          {isRecording && (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-75" />
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-150" />
              </div>
              <span className="text-sm text-neutral-500">Recording...</span>
            </div>
          )}
        </div>
      ) : (
        <div className="p-3 bg-green-50 rounded-xl border border-green-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-700 font-medium">
                {isRestored ? 'Voice note restored from draft' : 'Voice note recorded'}
              </span>
              <span className="text-xs text-green-600">({formatTime(recordingTime)})</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={deleteRecording}
                disabled={disabled}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-neutral-600 hover:text-primary-600 hover:bg-white rounded transition-colors disabled:opacity-50"
                title="Re-record"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Redo
              </button>
              <button
                type="button"
                onClick={deleteRecording}
                disabled={disabled}
                className="p-1.5 rounded-full text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                title="Delete recording"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              className="w-full h-10"
              preload="metadata"
              onEnded={handleAudioEnded}
            />
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Get the best supported MIME type for audio recording
 * Prioritizes Safari-compatible formats
 */
function getSupportedMimeType() {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/mp4;codecs=mp4a',
    'audio/aac',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  
  // Fallback - let browser decide
  return '';
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMime(mimeType) {
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('aac')) return 'aac';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
}

export default VoiceRecorder;
