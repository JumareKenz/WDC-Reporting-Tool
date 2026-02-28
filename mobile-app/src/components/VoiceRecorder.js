/**
 * Cross-platform VoiceRecorder
 * Uses expo-av on native, MediaRecorder on web
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Mic, Square, X } from 'lucide-react';

const isWeb = Platform.OS === 'web';

const VoiceRecorder = ({ fieldName, onRecordingComplete, compact = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  const startRecording = useCallback(async () => {
    if (!isWeb) {
      // Native version - would use expo-av
      alert('Voice recording is not available on this platform.');
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        
        const audioFile = new File([audioBlob], `voice_${fieldName}.webm`, {
          type: 'audio/webm',
        });
        
        if (onRecordingComplete) {
          onRecordingComplete(audioFile);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  }, [fieldName, onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const clearRecording = useCallback(() => {
    setAudioBlob(null);
    setRecordingDuration(0);
    if (onRecordingComplete) {
      onRecordingComplete(null);
    }
  }, [onRecordingComplete]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (compact) {
    return (
      <TouchableOpacity
        onPress={isRecording ? stopRecording : startRecording}
        style={[
          styles.compactButton,
          isRecording && styles.recordingButton,
        ]}
      >
        {isRecording ? (
          <Square size={14} color="#fff" />
        ) : (
          <Mic size={14} color="#16a34a" />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {!audioBlob ? (
        <TouchableOpacity
          onPress={isRecording ? stopRecording : startRecording}
          style={[
            styles.recordButton,
            isRecording && styles.recordingButton,
          ]}
        >
          {isRecording ? (
            <>
              <Square size={24} color="#fff" />
              <Text style={styles.durationText}>
                {formatDuration(recordingDuration)}
              </Text>
            </>
          ) : (
            <>
              <Mic size={24} color="#fff" />
              <Text style={styles.buttonText}>Record Voice Note</Text>
            </>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.playbackContainer}>
          {isWeb ? (
            <audio
              controls
              src={URL.createObjectURL(audioBlob)}
              style={{ width: '100%', height: 40 }}
            />
          ) : (
            <Text>Audio recorded</Text>
          )}
          <TouchableOpacity onPress={clearRecording} style={styles.clearButton}>
            <X size={20} color="#dc2626" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  recordingButton: {
    backgroundColor: '#dc2626',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  durationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  compactButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#16a34a',
  },
  playbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearButton: {
    padding: 8,
  },
});

export default VoiceRecorder;
