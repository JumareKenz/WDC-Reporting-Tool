import apiClient from './client';

/**
 * Send an image for OCR extraction of report fields.
 * @param {File|Blob} imageFile - The image file to process
 * @returns {Promise<Object>} Extracted field values keyed by field name
 */
export const ocrExtract = async (imageFile) => {
  const formData = new FormData();
  formData.append('file', imageFile);
  return apiClient.post('/attachments/ocr', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
};

/**
 * Send audio for ASR (Automatic Speech Recognition) transcription.
 * @param {Blob} audioBlob - The audio recording
 * @param {string} fieldName - The form field this recording answers
 * @param {string} language - 'en' or 'ha' (Hausa)
 * @returns {Promise<Object>} { transcription, value, field_name }
 */
export const asrTranscribe = async (audioBlob, fieldName, language = 'en') => {
  const formData = new FormData();
  formData.append('file', audioBlob, `recording.webm`);
  formData.append('field_name', fieldName);
  formData.append('language', language);
  return apiClient.post('/attachments/asr', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  });
};
