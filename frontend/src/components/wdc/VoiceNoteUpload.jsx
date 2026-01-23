import { useState, useRef } from 'react';
import { Upload, File, X, AlertCircle, Mic } from 'lucide-react';
import Button from '../common/Button';
import { InlineAlert } from '../common/Alert';
import { FILE_UPLOAD } from '../../utils/constants';

const VoiceNoteUpload = ({ onChange, disabled = false }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Format duration (if available)
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Validate file
  const validateFile = (file) => {
    // Check file type
    if (!FILE_UPLOAD.VOICE_NOTE_MIME_TYPES.includes(file.type)) {
      const acceptedFormats = FILE_UPLOAD.VOICE_NOTE_FORMATS.join(', ');
      return `Invalid file type. Please upload an audio file (${acceptedFormats})`;
    }

    // Check file size
    if (file.size > FILE_UPLOAD.VOICE_NOTE_MAX_SIZE) {
      const maxSizeMB = FILE_UPLOAD.VOICE_NOTE_MAX_SIZE / (1024 * 1024);
      return `File size exceeds ${maxSizeMB}MB limit. Please choose a smaller file.`;
    }

    return null;
  };

  // Handle file selection
  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setFile(null);
      onChange?.(null);
      return;
    }

    setError(null);
    setFile(selectedFile);
    onChange?.(selectedFile);
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  // Handle remove file
  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
    onChange?.(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  // Open file picker
  const openFilePicker = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-3">
      {/* File Input (Hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        accept={FILE_UPLOAD.VOICE_NOTE_FORMATS.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Upload Area */}
      {!file ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openFilePicker}
          className={`
            relative border-2 border-dashed rounded-lg p-8
            transition-all duration-200 cursor-pointer
            ${
              dragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-neutral-300 hover:border-primary-400 hover:bg-neutral-50'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <div className="text-center">
            <div className="mx-auto w-12 h-12 mb-4 flex items-center justify-center rounded-full bg-primary-100">
              <Mic className="w-6 h-6 text-primary-600" />
            </div>
            <p className="text-sm font-medium text-neutral-900 mb-1">
              Upload Voice Note
            </p>
            <p className="text-xs text-neutral-600 mb-4">
              Drag and drop or click to browse
            </p>
            <div className="space-y-1 text-xs text-neutral-500">
              <p>Supported formats: MP3, M4A, WAV, OGG</p>
              <p>Maximum size: 10MB</p>
            </div>
          </div>
        </div>
      ) : (
        /* File Preview */
        <div className="border border-neutral-300 rounded-lg p-4 bg-neutral-50">
          <div className="flex items-start gap-3">
            {/* File Icon */}
            <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <File className="w-5 h-5 text-primary-600" />
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 truncate">
                {file.name}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-xs text-neutral-600">
                  {formatFileSize(file.size)}
                </p>
                <p className="text-xs text-neutral-400">
                  {file.type.split('/')[1].toUpperCase()}
                </p>
              </div>
            </div>

            {/* Remove Button */}
            <button
              type="button"
              onClick={handleRemoveFile}
              disabled={disabled}
              className="flex-shrink-0 p-1 text-neutral-400 hover:text-red-600 transition-colors disabled:opacity-50"
              aria-label="Remove file"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Audio Preview */}
          <div className="mt-3 pt-3 border-t border-neutral-200">
            <audio
              controls
              src={URL.createObjectURL(file)}
              className="w-full h-10"
              style={{ maxHeight: '40px' }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <InlineAlert type="error" message={error} />
      )}

      {/* Help Text */}
      {!file && !error && (
        <div className="flex items-start gap-2 text-xs text-neutral-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            Voice notes help provide additional context to your report. This is optional
            but highly recommended for detailed explanations.
          </p>
        </div>
      )}
    </div>
  );
};

export default VoiceNoteUpload;
