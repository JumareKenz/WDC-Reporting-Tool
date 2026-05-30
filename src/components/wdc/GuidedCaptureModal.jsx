/**
 * Guided Capture Modal — frame-aligned, per-page template extraction.
 *
 * The user captures each form page after aligning it to an on-screen reference
 * frame (the rendered template page). Each capture is run through
 * coordinate-based template extraction (templateRegistrationService via
 * enhancedOcrService.extractPageFields), so values are read from known cell
 * positions instead of fragile full-page pattern matching.
 *
 * Flow per page:
 *   align to reference frame → capture → quality check → extract → review →
 *   next page. On finish, the merged field map is returned to the parent.
 *
 * Works on web (file/camera picker) and native (system camera). The reference
 * frame + post-capture perspective warp absorb residual misalignment.
 *
 * @module GuidedCaptureModal
 */

import { useState, useEffect, useCallback } from 'react';
import { Camera, Check, AlertTriangle, ChevronRight, RotateCcw, Lightbulb, Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { camera } from '../../plugins/capacitor';
import { analyzeImageQuality } from '../../services/imageQualityService';
import { initializeOCR, extractPageFields } from '../../services/enhancedOcrService';
import { FIELDS_BY_TEMPLATE } from '../../data/formTemplateCoordinates.js';

// Reference images for the alignment frame (rendered template pages).
import refPage2 from '../../assets/templates/template_page2.png';
import refPage3 from '../../assets/templates/template_page3.png';
import refPage4 from '../../assets/templates/template_page4.png';
import refPage6 from '../../assets/templates/template_page6.png';

// ────────────────────────────────────────────────────────────────────────────
// Capture page configuration — only pages that hold extractable fields.
// ────────────────────────────────────────────────────────────────────────────

const CAPTURE_PAGES = [
  {
    key: 'page2',
    title: 'Section 3A — Health System',
    reference: refPage2,
    tips: [
      'Frame the whole Section 3A table (header down to TB).',
      'Photograph straight-on so the table edges look square.',
    ],
  },
  {
    key: 'page3',
    title: 'TB Cases + Section 3C Transportation',
    reference: refPage3,
    tips: [
      'Include rows 20–21 (TB) and the Transportation table.',
      'Keep the page flat and well lit.',
    ],
  },
  {
    key: 'page4',
    title: 'Section 3D — MPDSR',
    reference: refPage4,
    tips: ['Frame the maternal & perinatal death rows.'],
  },
  {
    key: 'page6',
    title: 'Conclusion & Attendance',
    reference: refPage6,
    tips: ['Include the attendance summary and next-meeting date.'],
  },
];

// ────────────────────────────────────────────────────────────────────────────

const GuidedCaptureModal = ({ isOpen, onClose, onComplete }) => {
  const [index, setIndex] = useState(0);
  const [pages, setPages] = useState({}); // key -> { base64, format, quality, fields, confidence, method, regQuality }
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | capturing | analyzing | extracting
  const [error, setError] = useState('');
  const [engineReady, setEngineReady] = useState(null); // null=unknown, true/false

  const page = CAPTURE_PAGES[index];
  const captured = pages[page.key];
  const capturedCount = Object.keys(pages).length;
  const progress = Math.round((capturedCount / CAPTURE_PAGES.length) * 100);

  useEffect(() => {
    if (!isOpen) return;
    setIndex(0);
    setPages({});
    setError('');
    setPhase('idle');
    // Warm up OCR + OpenCV engines.
    initializeOCR()
      .then((s) => setEngineReady(!!s.tesseract))
      .catch(() => setEngineReady(false));
  }, [isOpen]);

  const handleCapture = useCallback(async () => {
    setError('');
    setBusy(true);
    setPhase('capturing');
    try {
      const photo = await camera.takePhoto();
      if (!photo?.base64) throw new Error('No image captured');

      setPhase('analyzing');
      let quality = null;
      try {
        quality = await analyzeImageQuality(photo.base64, photo.format);
      } catch { /* quality is advisory only */ }

      setPhase('extracting');
      const result = await extractPageFields(photo.base64, photo.format, page.key);

      setPages((prev) => ({
        ...prev,
        [page.key]: {
          base64: photo.base64,
          format: photo.format,
          quality,
          fields: result.fields,
          confidence: result.confidence,
          method: result.method,
          regQuality: result.quality,
        },
      }));
    } catch (err) {
      if (err?.message !== 'No file selected' && err?.message !== 'User cancelled photos app') {
        setError(err?.message || 'Capture failed. Please try again.');
      }
    } finally {
      setBusy(false);
      setPhase('idle');
    }
  }, [page]);

  const handleRetake = useCallback(() => {
    setPages((prev) => {
      const next = { ...prev };
      delete next[page.key];
      return next;
    });
    setError('');
  }, [page]);

  const goNext = useCallback(() => {
    if (index < CAPTURE_PAGES.length - 1) setIndex((i) => i + 1);
  }, [index]);

  const goPrev = useCallback(() => {
    if (index > 0) setIndex((i) => i - 1);
  }, [index]);

  const handleComplete = useCallback(() => {
    const merged = {};
    for (const p of CAPTURE_PAGES) {
      const cap = pages[p.key];
      if (cap?.fields) Object.assign(merged, cap.fields);
    }
    onComplete(merged);
    onClose();
  }, [pages, onComplete, onClose]);

  if (!isOpen) return null;

  const isLast = index === CAPTURE_PAGES.length - 1;
  const phaseLabel = { capturing: 'Capturing…', analyzing: 'Checking quality…', extracting: 'Reading values…' }[phase];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Guided Photo Scan" size="fullscreen">
      <div className="flex flex-col h-full">
        {/* Progress */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Page {index + 1} of {CAPTURE_PAGES.length}</span>
            <span>{capturedCount}/{CAPTURE_PAGES.length} captured</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-600 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Page header */}
        <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-green-100 border-b">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{page.title}</h3>
          <div className="flex items-start gap-2 text-xs text-gray-600">
            <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <ul className="list-disc list-inside">
              {page.tips.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
          {engineReady === false && (
            <p className="mt-2 text-xs text-amber-700">
              Note: on-device reader is limited here — values will be read with the basic engine.
            </p>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto bg-gray-900 relative">
          {captured ? (
            <ReviewPane page={page} captured={captured} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
              {/* Alignment reference frame */}
              <div className="relative max-h-[55vh] border-4 border-dashed border-green-400 rounded-lg overflow-hidden bg-white">
                <img src={page.reference} alt={page.title} className="max-h-[54vh] object-contain opacity-90" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                    Align your form to fill this frame
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-300 mt-4 max-w-md">
                Photograph this section straight-on, filling the frame. We’ll read the values from the table cells automatically.
              </p>
              {busy && (
                <div className="mt-4 flex items-center gap-2 text-white">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{phaseLabel}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Actions */}
        <div className="p-4 bg-white border-t space-y-3">
          <div className="flex gap-3">
            {captured ? (
              <>
                <Button variant="outline" icon={RotateCcw} onClick={handleRetake} className="flex-1">
                  Retake
                </Button>
                <Button
                  variant="primary"
                  icon={isLast ? Check : ChevronRight}
                  onClick={isLast ? handleComplete : goNext}
                  className="flex-1"
                >
                  {isLast ? 'Finish & Apply' : 'Next Page'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={isLast ? handleComplete : goNext} className="flex-1" disabled={busy}>
                  Skip
                </Button>
                <Button variant="primary" icon={Camera} onClick={handleCapture} disabled={busy} className="flex-1">
                  {busy ? phaseLabel : 'Capture'}
                </Button>
              </>
            )}
          </div>
          <div className="flex justify-between text-sm">
            <button onClick={goPrev} disabled={index === 0 || busy}
              className="text-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed">
              ← Previous
            </button>
            <button onClick={handleComplete} disabled={capturedCount === 0 || busy}
              className="text-green-600 font-medium disabled:text-gray-300 disabled:cursor-not-allowed">
              Finish ({capturedCount} captured)
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Review pane — captured image + extracted values for the page.
// ────────────────────────────────────────────────────────────────────────────

const ReviewPane = ({ page, captured }) => {
  const allFields = FIELDS_BY_TEMPLATE[page.key] || [];
  const got = captured.fields || {};
  const conf = captured.confidence || {};
  const readCount = Object.keys(got).length;

  return (
    <div className="h-full flex flex-col md:flex-row">
      <div className="md:w-1/2 bg-black flex items-center justify-center p-2">
        <img
          src={`data:image/${captured.format};base64,${captured.base64}`}
          alt={page.title}
          className="max-h-[40vh] md:max-h-[70vh] object-contain"
        />
      </div>
      <div className="md:w-1/2 bg-white overflow-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-800">
            Read {readCount}/{allFields.length} values
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${
            captured.method === 'template_registration' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {captured.method === 'template_registration' ? 'Template aligned' : 'Basic reader'}
          </span>
        </div>
        {captured.regQuality && (
          <p className="text-xs text-gray-500 mb-3">{captured.regQuality.message}</p>
        )}
        <table className="w-full text-sm">
          <tbody>
            {allFields.map((f) => {
              const v = got[f];
              const c = conf[f] ?? 0;
              const flagged = v === undefined || c < 60;
              return (
                <tr key={f} className="border-t border-gray-100">
                  <td className="py-1.5 pr-2 font-mono text-xs text-gray-500">{f}</td>
                  <td className={`py-1.5 text-right font-medium ${flagged ? 'text-amber-600' : 'text-gray-900'}`}>
                    {v === undefined ? '— review' : String(v)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="text-xs text-gray-400 mt-3">
          Amber values need a manual check after applying.
        </p>
      </div>
    </div>
  );
};

export default GuidedCaptureModal;
