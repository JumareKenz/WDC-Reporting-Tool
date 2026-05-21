import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Check, Loader2, AlertTriangle, RotateCcw, CloudUpload } from 'lucide-react';
import { uploadVoiceNote } from '../api/reports';
import { saveVoiceNoteBlob, getVoiceNoteBlob, deleteVoiceNoteBlob } from '../utils/voiceNoteStorage';

/**
 * Voice Note Recorder Component
 * 
 * Props:
 * - reportId: string (required) - Report ID
 * - fieldName: string (required) - Field name/key matching report field
 * - existingNote: object|null - Existing voice note from server { id, field_name, status, audio_url, transcription_text }
 * - disabled: bool - Disable when form is read-only
 * - onUploadSuccess: function - Callback when upload succeeds (optional)
 */

const RECORDING_MAX_DURATION = 180; // 3 minutes in seconds

const VoiceNoteRecorder = ({ 
  reportId, 
  fieldName, 
  existingNote = null, 
  disabled = false,
  onUploadSuccess,
}) => {
  // State machine: idle | recording | uploading | saved | error
  const [status, setStatus] = useState(existingNote ? 'saved' : 'idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(existingNote?.audio_url || null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [mimeType, setMimeType] = useState('audio/webm');
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const streamRef = useRef(null);

  // Determine supported MIME type
  const getSupportedMimeType = useCallback(() => {
    const types = ['audio/webm', 'audio/mp4', 'audio/ogg'];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'audio/webm'; // fallback
  }, []);

  // Check for pending offline blob on mount
  useEffect(() => {
    const checkPendingBlob = async () => {
      if (!reportId || !fieldName) return;
      
      const pending = await getVoiceNoteBlob(reportId, fieldName);
      if (pending) {
        setAudioBlob(pending.blob);
        setMimeType(pending.mimeType);
        const url = URL.createObjectURL(pending.blob);
        setAudioUrl(url);
        setStatus(isOffline ? 'offline-pending' : 'saved');
      }
    };
    
    if (!existingNote) {
      checkPendingBlob();
    }
  }, [reportId, fieldName, existingNote, isOffline]);

  // Handle online/offline changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // If we have an offline pending blob, try to upload it
      if (status === 'offline-pending' && audioBlob) {
        handleUpload(audioBlob);
      }
    };
    
    const handleOffline = () => {
      setIsOffline(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [status, audioBlob]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    setErrorMessage(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const selectedMimeType = getSupportedMimeType();
      setMimeType(selectedMimeType);
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: selectedMimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: selectedMimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Proceed to upload or offline storage
        if (navigator.onLine) {
          handleUpload(blob, selectedMimeType);
        } else {
          handleOfflineSave(blob, selectedMimeType);
        }
      };
      
      mediaRecorder.start(100);
      setStatus('recording');
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= RECORDING_MAX_DURATION) {
            // Auto-stop at max duration
            stopRecording();
          }
          return newTime;
        });
      }, 1000);
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone access denied. Please enable in your browser settings.');
      } else {
        setErrorMessage('Could not access microphone. Please try again.');
      }
      setStatus('error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === 'recording') {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && status === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      // Discard the recording
      chunksRef.current = [];
      setStatus('idle');
      setRecordingTime(0);
    }
  };

  const handleOfflineSave = async (blob, type) => {
    const saved = await saveVoiceNoteBlob(reportId, fieldName, blob, type || mimeType);
    if (saved) {
      setStatus('offline-pending');
    } else {
      setErrorMessage('Failed to save recording locally.');
      setStatus('error');
    }
  };

  const handleUpload = async (blob, type) => {
    if (!reportId) {
      // Draft mode - save offline until we have a report ID
      await handleOfflineSave(blob, type);
      return;
    }
    
    setStatus('uploading');
    
    try {
      const response = await uploadVoiceNote(reportId, fieldName, blob, type || mimeType);
      
      // Clear from IndexedDB if it was stored offline
      await deleteVoiceNoteBlob(reportId, fieldName);
      
      setStatus('saved');
      if (onUploadSuccess) {
        onUploadSuccess(response);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setErrorMessage('Failed to save. Tap to try again.');
      setStatus('error');
    }
  };

  const handleRetry = () => {
    if (audioBlob && navigator.onLine) {
      handleUpload(audioBlob, mimeType);
    } else if (!navigator.onLine) {
      setErrorMessage('You are offline. Recording will upload when connected.');
    }
  };

  const handleReRecord = () => {
    // Clean up existing recording
    if (audioUrl && !existingNote?.audio_url) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setErrorMessage(null);
    setStatus('idle');
    
    // Also clear from IndexedDB
    if (reportId && fieldName) {
      deleteVoiceNoteBlob(reportId, fieldName);
    }
  };

  // IDLE STATE
  if (status === 'idle') {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={startRecording}
          disabled={disabled}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Mic className="w-4 h-4" />
          <span className="text-sm font-medium">Add voice note</span>
        </button>
        {errorMessage && (
          <span className="text-xs text-red-500">{errorMessage}</span>
        )}
      </div>
    );
  }

  // RECORDING STATE
  if (status === 'recording') {
    return (
      <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
        {/* Red pulsing circle */}
        <div className="relative">
          <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
          <div className="absolute inset-0 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-30" />
        </div>
        
        {/* Timer */}
        <span className="text-sm font-mono font-medium text-red-600 min-w-[50px]">
          {formatTime(recordingTime)}
        </span>
        
        {/* Stop button */}
        <button
          type="button"
          onClick={stopRecording}
          className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
        >
          <Square className="w-3 h-3 fill-current" />
          Stop
        </button>
        
        {/* Cancel button */}
        <button
          type="button"
          onClick={cancelRecording}
          className="text-sm text-neutral-500 hover:text-neutral-700 underline"
        >
          Cancel
        </button>
        
        {/* Max duration indicator */}
        <span className="text-xs text-neutral-400 ml-auto">
          Max {formatTime(RECORDING_MAX_DURATION)}
        </span>
      </div>
    );
  }

  // UPLOADING STATE
  if (status === 'uploading') {
    return (
      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
        <span className="text-sm text-blue-600 font-medium">Saving voice note...</span>
      </div>
    );
  }

  // SAVED STATE
  if (status === 'saved') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
          <Check className="w-5 h-5 text-green-500" />
          <span className="text-sm text-green-600 font-medium">Voice note saved</span>
          
          {/* Re-record button */}
          <button
            type="button"
            onClick={handleReRecord}
            disabled={disabled}
            className="ml-auto flex items-center gap-1 px-2 py-1 text-xs font-medium text-neutral-600 hover:text-primary-600 hover:bg-white rounded transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3" />
            Re-record
          </button>
        </div>
        
        {/* Audio player */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            className="w-full h-10"
            preload="metadata"
          />
        )}
      </div>
    );
  }

  // OFFLINE-PENDING STATE
  if (status === 'offline-pending') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
          <CloudUpload className="w-5 h-5 text-amber-500" />
          <div className="flex-1">
            <span className="text-sm text-amber-700 font-medium">Saved offline</span>
            <p className="text-xs text-amber-600">Will upload when connected</p>
          </div>
          
          {/* Re-record button */}
          <button
            type="button"
            onClick={handleReRecord}
            disabled={disabled}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-neutral-600 hover:text-amber-700 hover:bg-white rounded transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3" />
            Re-record
          </button>
        </div>
        
        {/* Audio player */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            className="w-full h-10"
            preload="metadata"
          />
        )}
      </div>
    );
  }

  // ERROR STATE
  if (status === 'error') {
    return (
      <div 
        className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100 cursor-pointer hover:bg-red-100 transition-colors"
        onClick={handleRetry}
      >
        <AlertTriangle className="w-5 h-5 text-red-500" />
        <div className="flex-1">
          <span className="text-sm text-red-600 font-medium">
            {errorMessage || 'Failed to save. Tap to try again.'}
          </span>
        </div>
        <RotateCcw className="w-4 h-4 text-red-400" />
      </div>
    );
  }

  return null;
};

export default VoiceNoteRecorder;
