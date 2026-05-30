import { useState } from 'react';
import { Camera, Upload, X, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { camera } from '../../plugins/capacitor';
import { performOCR, mapTextToFields } from '../../services/ocrService';

const OCRSubmitModal = ({ isOpen, onClose, onFieldsExtracted }) => {
  const [status, setStatus] = useState('idle'); // idle | uploading | processing | done | error
  const [errorMessage, setErrorMessage] = useState('');
  const [extractedFields, setExtractedFields] = useState(null);
  const [totalPatternFields, setTotalPatternFields] = useState(0);

  const handleCapture = async (source) => {
    try {
      setStatus('uploading');
      setErrorMessage('');

      let imageData;
      if (source === 'camera') {
        imageData = await camera.takePhoto();
      } else {
        imageData = await camera.pickFromGallery();
      }

      setStatus('processing');

      const rawText = await performOCR(imageData.base64, imageData.format);
      const { fields, totalPatternFields: total } = await mapTextToFields(rawText);

      if (Object.keys(fields).length === 0) {
        throw new Error('No data could be extracted from the photo. Check that the form is well-lit, in focus, and that labels are clearly printed next to their values.');
      }

      setExtractedFields(fields);
      setTotalPatternFields(total);
      setStatus('done');
    } catch (err) {
      if (err.message === 'No file selected') {
        setStatus('idle');
        return;
      }
      setErrorMessage(err.message || 'Could not extract data from photo. Please fill the form manually.');
      setStatus('error');
    }
  };

  const handleConfirm = () => {
    if (extractedFields) {
      onFieldsExtracted(extractedFields);
    }
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setStatus('idle');
    setErrorMessage('');
    setExtractedFields(null);
    setTotalPatternFields(0);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Submit via Photo (OCR)" size="md">
      <div className="space-y-4">
        {status === 'idle' && (
          <>
            <p className="text-sm text-neutral-600">
              Take a photo of a filled report form or upload one from your gallery.
              We'll extract the data automatically.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleCapture('camera')}
                className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-neutral-300 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all"
              >
                <Camera className="w-10 h-10 text-primary-600" />
                <span className="text-sm font-medium text-neutral-700">Take Photo</span>
              </button>
              <button
                onClick={() => handleCapture('gallery')}
                className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-neutral-300 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all"
              >
                <Upload className="w-10 h-10 text-primary-600" />
                <span className="text-sm font-medium text-neutral-700">Upload from Gallery</span>
              </button>
            </div>
          </>
        )}

        {(status === 'uploading' || status === 'processing') && (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium text-neutral-900">
              {status === 'uploading' ? 'Capturing photo...' : 'Extracting data from photo...'}
            </p>
            <p className="text-sm text-neutral-500 mt-2">Processing on-device — no internet needed</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-6">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-neutral-900 mb-2">Extraction Failed</p>
            <p className="text-sm text-neutral-600 mb-6">{errorMessage}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleReset}>Try Again</Button>
              <Button variant="secondary" onClick={handleClose}>Fill Manually</Button>
            </div>
          </div>
        )}

        {status === 'done' && extractedFields && (() => {
          const matchedCount = Object.keys(extractedFields).length;
          const isPartial = totalPatternFields > 0 && matchedCount < totalPatternFields;
          return (
          <div>
            {isPartial ? (
              <div className="flex items-start gap-2 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-amber-800">
                  Extracted {matchedCount} of {totalPatternFields} fields — fill the rest manually. Table rows (Action Tracker, VDC Reports, Action Plan) only extract when the scanned form has printed table borders.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0" />
                <p className="text-sm font-medium text-primary-800">
                  {matchedCount} field{matchedCount === 1 ? '' : 's'} filled automatically — please review before submitting
                </p>
              </div>
            )}
            <div className="max-h-64 overflow-y-auto border border-neutral-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-neutral-700">Field</th>
                    <th className="text-left px-3 py-2 font-medium text-neutral-700">Extracted Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(extractedFields).map(([key, value]) => (
                    <tr key={key} className="border-t border-neutral-100">
                      <td className="px-3 py-2 text-neutral-600 font-mono text-xs">{key}</td>
                      <td className="px-3 py-2 text-neutral-900">{String(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={handleReset} className="flex-1">
                Retake Photo
              </Button>
              <Button variant="primary" onClick={handleConfirm} className="flex-1">
                Apply to Form
              </Button>
            </div>
          </div>
          );
        })()}
      </div>
    </Modal>
  );
};

export default OCRSubmitModal;
