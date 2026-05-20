/**
 * On-device Speech Recognition Service
 *
 * Strategy:
 * - Native (Android): Uses Android's built-in SpeechRecognizer via Capacitor plugin
 *   (requires offline language pack download for offline use)
 * - Web: Uses Web Speech API (SpeechRecognition) — online only in most browsers,
 *   but works offline in Chrome Android with downloaded language packs
 *
 * Both return transcribed text. The value extraction logic then converts
 * spoken answers to field values (e.g., "twenty three" → 23).
 */

import { isNative } from '../plugins/capacitor';
import { registerPlugin } from '@capacitor/core';

const SpeechRecognitionPlugin = registerPlugin('SpeechRecognition', {
  web: () => ({
    startListening: async () => { throw new Error('Use Web Speech API'); },
    stopListening: async () => {},
    available: async () => ({ available: false }),
    ensureLanguageAvailable: async () => ({ triggered: true }),
  }),
});

/**
 * Ensure the offline English speech model is available.
 * On Android with Google Play Services, the English model is typically pre-installed.
 * This call triggers a silent background download if it's somehow missing.
 * Call this once at app startup (e.g., in main.jsx or App.jsx).
 */
export async function ensureOfflineSpeechModel(language = 'en-US') {
  if (isNative) {
    try {
      await SpeechRecognitionPlugin.ensureLanguageAvailable({ language });
    } catch {
      // Non-critical — speech will still work online
    }
  }
}

/**
 * Check if on-device speech recognition is available.
 */
export async function isSpeechAvailable() {
  if (isNative) {
    try {
      const { available } = await SpeechRecognitionPlugin.available();
      return available;
    } catch {
      return false;
    }
  }
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

/**
 * Listen for speech and return transcribed text.
 * @param {Object} options
 * @param {string} options.language - 'en-US' or 'ha-NG'
 * @param {Function} options.onPartialResult - Called with interim text as user speaks
 * @returns {Promise<string>} Final transcription
 */
export function listenForSpeech({ language = 'en-US', onPartialResult = null }) {
  if (isNative) {
    return listenNative({ language, onPartialResult });
  }
  return listenWebSpeechAPI({ language, onPartialResult });
}

/**
 * Android native speech recognition via Capacitor plugin.
 * Uses android.speech.SpeechRecognizer — works offline if language pack is downloaded.
 */
function listenNative({ language, onPartialResult }) {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await SpeechRecognitionPlugin.startListening({
        language,
        maxResults: 1,
        partialResults: !!onPartialResult,
        popup: false,
      });

      if (result?.matches?.length > 0) {
        resolve(result.matches[0]);
      } else {
        resolve('');
      }
    } catch (err) {
      reject(new Error(err.message || 'Speech recognition failed'));
    }
  });
}

/**
 * Web Speech API — built into Chrome, Edge, Safari.
 * Works offline in Chrome Android if user has downloaded the language pack.
 */
function listenWebSpeechAPI({ language, onPartialResult }) {
  return new Promise((resolve, reject) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return reject(new Error('Speech recognition not supported in this browser'));
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = !!onPartialResult;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    let finalTranscript = '';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }
      if (onPartialResult && interim) {
        onPartialResult(interim);
      }
    };

    recognition.onend = () => {
      resolve(finalTranscript);
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        resolve('');
      } else {
        reject(new Error(`Speech recognition error: ${event.error}`));
      }
    };

    recognition.start();

    // Store reference so we can stop it externally
    listenWebSpeechAPI._activeRecognition = recognition;
  });
}

/**
 * Stop any active recognition session.
 */
export function stopListening() {
  if (isNative) {
    SpeechRecognitionPlugin.stopListening().catch(() => {});
  } else if (listenWebSpeechAPI._activeRecognition) {
    listenWebSpeechAPI._activeRecognition.stop();
    listenWebSpeechAPI._activeRecognition = null;
  }
}

/**
 * Parse a spoken answer into a typed value for a form field.
 * Handles: numbers (spoken or digit), yes/no, dates.
 *
 * @param {string} transcript - Raw transcription text
 * @param {string} fieldType - 'number', 'text', 'select', 'date'
 * @param {Object} options - Additional context (e.g., select options, language)
 * @returns {*} Parsed value appropriate for the field type
 */
export function parseSpokenValue(transcript, fieldType, options = {}) {
  const text = transcript.trim().toLowerCase();

  if (fieldType === 'number') {
    return parseSpokenNumber(text);
  }

  if (fieldType === 'select' && options.options) {
    return matchSelectOption(text, options.options, options.language);
  }

  if (fieldType === 'date') {
    return parseSpokenDate(text);
  }

  // Text fields — return as-is with proper casing
  return transcript.trim();
}

/**
 * Convert spoken numbers to integers.
 * Handles: "23", "twenty three", "none", "zero", "no" → 0
 */
function parseSpokenNumber(text) {
  // Direct digit
  const digitMatch = text.match(/\d+/);
  if (digitMatch) return parseInt(digitMatch[0], 10);

  // None / zero / no
  if (/^(none|zero|no|nil|nothing|a'a|babu)$/i.test(text)) return 0;
  if (/^(one|daya)$/i.test(text)) return 1;
  if (/^(two|biyu)$/i.test(text)) return 2;
  if (/^(three|uku)$/i.test(text)) return 3;
  if (/^(four|hudu)$/i.test(text)) return 4;
  if (/^(five|biyar)$/i.test(text)) return 5;
  if (/^(six|shida)$/i.test(text)) return 6;
  if (/^(seven|bakwai)$/i.test(text)) return 7;
  if (/^(eight|takwas)$/i.test(text)) return 8;
  if (/^(nine|tara)$/i.test(text)) return 9;
  if (/^(ten|goma)$/i.test(text)) return 10;

  // Word-to-number for common teens/tens
  const wordMap = {
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
    thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
    hundred: 100,
  };

  for (const [word, num] of Object.entries(wordMap)) {
    if (text.includes(word)) {
      // Handle "twenty three" → 23
      const remaining = text.replace(word, '').trim();
      const bonus = parseSpokenNumber(remaining);
      if (bonus > 0 && bonus < num) return num + bonus;
      return num;
    }
  }

  // Hausa tens
  const hausaTens = {
    'goma sha': 10, 'ashirin': 20, 'talatin': 30, 'arba\'in': 40,
    'hamsin': 50, 'sittin': 60, 'saba\'in': 70, 'tamanin': 80, 'casa\'in': 90,
  };
  for (const [word, num] of Object.entries(hausaTens)) {
    if (text.includes(word)) return num;
  }

  return isNaN(Number(text)) ? 0 : Number(text);
}

/**
 * Match spoken text to a select option.
 */
function matchSelectOption(text, options, language) {
  // Exact match
  const exact = options.find((o) => o.toLowerCase() === text);
  if (exact) return exact;

  // Partial match
  const partial = options.find((o) => text.includes(o.toLowerCase()) || o.toLowerCase().includes(text));
  if (partial) return partial;

  // Yes/No mapping for Hausa
  if (language === 'ha') {
    if (/^(eh|iya|na'am|yes)$/i.test(text)) return options.find((o) => /yes|monthly/i.test(o)) || options[0];
    if (/^(a'a|ba|no)$/i.test(text)) return options.find((o) => /no/i.test(o)) || options[1];
  }

  return options[0];
}

/**
 * Parse spoken date (basic).
 */
function parseSpokenDate(text) {
  // Try native Date parsing
  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return text;
}
