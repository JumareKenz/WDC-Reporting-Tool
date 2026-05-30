import { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, X, Check, RotateCcw, Globe, ChevronRight, Volume2 } from 'lucide-react';
import Button from '../common/Button';
import { listenForSpeech, stopListening, parseSpokenValue } from '../../services/speechService';
import { loadActiveFieldConfig, buildVoiceQuestions } from '../../services/formConfigService';

const VoiceAssistantModal = ({ isOpen, onClose, formData, onFieldsCollected }) => {
  const [language, setLanguage] = useState('en');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState('speaking'); // speaking | listening | processing | confirm | summary
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [extractedValue, setExtractedValue] = useState('');
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');
  const synthRef = useRef(null);

  const [filteredQuestions, setFilteredQuestions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const config = await loadActiveFieldConfig();
      if (cancelled) return;
      const questions = buildVoiceQuestions(config, formData || {});

      // DEBUG: Log what fields are being skipped
      console.log('[Voice Assistant] Total questions generated:', questions.length);
      if (questions.length > 0) {
        console.log('[Voice Assistant] First question:', questions[0].field, '-', questions[0].en);
        console.log('[Voice Assistant] First 5 fields:', questions.slice(0, 5).map(q => q.field));
      }

      // Log some formData to see what's pre-filled
      const sampleFields = ['meeting_type', 'report_date', 'health_general_attendance_total', 'health_anc_fourth_visit'];
      const fieldValues = sampleFields.reduce((acc, field) => {
        acc[field] = formData?.[field];
        return acc;
      }, {});
      console.log('[Voice Assistant] Sample field values:', fieldValues);

      setFilteredQuestions(questions);
    })();
    return () => { cancelled = true; };
  }, [formData, isOpen]);

  const totalQuestions = filteredQuestions.length;
  const currentQuestion = filteredQuestions[currentIndex];

  useEffect(() => {
    if (!isOpen) {
      setCurrentIndex(0);
      setPhase('speaking');
      setAnswers({});
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && phase === 'speaking' && currentQuestion) {
      speakQuestion(currentQuestion[language] || currentQuestion.en);
    }
  }, [currentIndex, phase, isOpen, language]);

  const speakQuestion = useCallback((text) => {
    if (!('speechSynthesis' in window)) {
      setPhase('listening');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'ha' ? 'ha-NG' : 'en-US';
    utterance.rate = 0.9;
    utterance.onend = () => setPhase('listening');
    utterance.onerror = () => setPhase('listening');
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [language]);

  const handleStartRecording = async () => {
    try {
      setError('');
      setIsRecording(true);
      setPhase('processing');

      const langCode = language === 'ha' ? 'ha-NG' : 'en-US';
      const transcript = await listenForSpeech({
        language: langCode,
        onPartialResult: (partial) => setTranscription(partial),
      });

      setIsRecording(false);
      setTranscription(transcript);

      const value = parseSpokenValue(transcript, currentQuestion.type, {
        options: currentQuestion.options,
        language,
      });
      setExtractedValue(value);
      setPhase('confirm');
    } catch (err) {
      setIsRecording(false);
      setError(err.message || 'Speech recognition failed. Please try again.');
      setPhase('listening');
    }
  };

  const handleStopRecording = () => {
    stopListening();
    setIsRecording(false);
  };

  const handleConfirm = () => {
    const newAnswers = { ...answers, [currentQuestion.field]: extractedValue };
    setAnswers(newAnswers);
    setTranscription('');
    setExtractedValue('');
    setError('');

    if (currentIndex + 1 >= totalQuestions) {
      setPhase('summary');
    } else {
      setCurrentIndex(currentIndex + 1);
      setPhase('speaking');
    }
  };

  const handleReRecord = () => {
    setTranscription('');
    setExtractedValue('');
    setError('');
    setPhase('listening');
  };

  const handleExit = () => {
    window.speechSynthesis?.cancel();
    if (Object.keys(answers).length > 0) {
      onFieldsCollected(answers);
    }
    onClose();
  };

  const handleSubmitAll = () => {
    onFieldsCollected(answers);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/20">
        <button onClick={handleExit} className="flex items-center gap-2 text-white/80 hover:text-white">
          <X className="w-5 h-5" />
          <span className="text-sm">Exit Voice Mode</span>
        </button>
        <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
          <Globe className="w-4 h-4 text-white/70" />
          <button
            onClick={() => setLanguage('en')}
            className={`text-sm px-2 py-0.5 rounded-full transition-all ${language === 'en' ? 'bg-white text-primary-900 font-semibold' : 'text-white/70'}`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage('ha')}
            className={`text-sm px-2 py-0.5 rounded-full transition-all ${language === 'ha' ? 'bg-white text-primary-900 font-semibold' : 'text-white/70'}`}
          >
            Hausa
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {phase !== 'summary' && currentQuestion && (
          <>
            {/* Question Text */}
            <div className="text-center mb-8 max-w-md">
              <p className="text-white text-xl sm:text-2xl font-medium leading-relaxed">
                {currentQuestion[language] || currentQuestion.en}
              </p>
            </div>

            {/* Status Indicator */}
            <div className="mb-8">
              {phase === 'speaking' && (
                <div className="flex items-center gap-2 text-emerald-300">
                  <Volume2 className="w-5 h-5 animate-pulse" />
                  <span className="text-sm">Speaking...</span>
                </div>
              )}
              {phase === 'listening' && !isRecording && (
                <p className="text-white/60 text-sm">Tap the microphone to answer</p>
              )}
              {isRecording && (
                <p className="text-red-300 text-sm animate-pulse">Listening...</p>
              )}
              {phase === 'processing' && (
                <div className="flex items-center gap-2 text-amber-300">
                  <div className="w-4 h-4 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Processing...</span>
                </div>
              )}
            </div>

            {/* Microphone Button */}
            {(phase === 'listening') && (
              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  isRecording
                    ? 'bg-red-500 animate-pulse shadow-red-500/50 scale-110'
                    : 'bg-white hover:bg-neutral-100 shadow-white/20 hover:scale-105'
                }`}
              >
                {isRecording ? (
                  <MicOff className="w-8 h-8 text-white" />
                ) : (
                  <Mic className="w-8 h-8 text-primary-600" />
                )}
              </button>
            )}

            {/* Confirm Phase */}
            {phase === 'confirm' && (
              <div className="w-full max-w-md space-y-4">
                <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                  <p className="text-xs text-white/50 mb-1">Transcription:</p>
                  <p className="text-white text-lg">{transcription || '(empty)'}</p>
                  {extractedValue !== transcription && (
                    <>
                      <p className="text-xs text-white/50 mt-3 mb-1">Extracted value:</p>
                      <p className="text-emerald-300 text-lg font-semibold">{String(extractedValue)}</p>
                    </>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    icon={RotateCcw}
                    onClick={handleReRecord}
                    className="flex-1 border-white/30 text-white hover:bg-white/10"
                  >
                    Re-record
                  </Button>
                  <Button
                    icon={Check}
                    onClick={handleConfirm}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-red-300 text-sm mt-4 text-center">{error}</p>
            )}
          </>
        )}

        {/* Summary Phase */}
        {phase === 'summary' && (
          <div className="w-full max-w-lg">
            <h2 className="text-white text-2xl font-bold text-center mb-6">
              Review Your Answers
            </h2>
            <div className="bg-white/10 rounded-xl border border-white/20 max-h-[50vh] overflow-y-auto">
              {Object.entries(answers).map(([field, value]) => (
                <div key={field} className="flex justify-between items-center px-4 py-3 border-b border-white/10 last:border-0">
                  <span className="text-white/70 text-sm">{field.replace(/_/g, ' ')}</span>
                  <span className="text-white font-medium text-sm">{String(value)}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={handleExit}
                className="flex-1 border-white/30 text-white hover:bg-white/10"
              >
                Exit & Save Progress
              </Button>
              <Button
                icon={ChevronRight}
                onClick={handleSubmitAll}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                Apply All to Form
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {phase !== 'summary' && (
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between text-white/60 text-sm mb-2">
            <span>Question {currentIndex + 1} of {totalQuestions}</span>
            <span>{Math.round(((currentIndex + 1) / totalQuestions) * 100)}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div
              className="h-2 bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceAssistantModal;
