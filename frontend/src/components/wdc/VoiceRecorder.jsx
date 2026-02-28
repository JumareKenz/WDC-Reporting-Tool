import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Check } from 'lucide-react';

/**
 * WhatsApp-style Voice Recorder Component
 * Can be attached to any form field for voice input
 */
const VoiceRecorder = ({
  fieldName,
  onRecordingComplete,
  disabled = false,
  compact = false,
  existingRecording = null
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(existingRecording);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const streamRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioUrl]);

  // Create audio URL when blob changes
  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [audioBlob]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType
        });
        setAudioBlob(blob);

        // Create file for form submission
        const file = new File([blob], `voice_${fieldName}_${Date.now()}.webm`, {
          type: blob.type
        });
        onRecordingComplete?.(file);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Microphone access denied. Please allow microphone access to record.');
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

  const deleteRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    onRecordingComplete?.(null);
  };

  // Compact inline style for form fields
  if (compact) {
    return (
      <div className="inline-flex items-center gap-1">
        {!audioBlob ? (
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled}
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
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={togglePlayback}
              className="p-1.5 rounded-full bg-primary-100 text-primary-600 hover:bg-primary-200 transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={deleteRecording}
              className="p-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
              title="Delete recording"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <Check className="w-4 h-4 text-green-500" />
          </div>
        )}
        {isRecording && (
          <span className="text-xs text-red-500 font-medium animate-pulse">
            {formatTime(recordingTime)}
          </span>
        )}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={handleAudioEnded}
            className="hidden"
          />
        )}
      </div>
    );
  }

  // Full-size component
  return (
    <div className="space-y-2">
      {error && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">
          {error}
        </div>
      )}

      {!audioBlob ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled}
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
        <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
          <button
            type="button"
            onClick={togglePlayback}
            className={`
              p-3 rounded-full transition-all duration-200
              ${isPlaying
                ? 'bg-primary-600 text-white'
                : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
              }
            `}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-primary-500 rounded-full ${isPlaying ? 'animate-pulse' : ''}`}
                  style={{ width: isPlaying ? '100%' : '0%', transition: 'width 0.3s' }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-neutral-500">
                Voice note recorded
              </span>
              <span className="text-xs font-medium text-neutral-600">
                {formatTime(recordingTime)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={deleteRecording}
            className="p-2 rounded-full text-red-500 hover:bg-red-50 transition-colors"
            title="Delete recording"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={handleAudioEnded}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;
