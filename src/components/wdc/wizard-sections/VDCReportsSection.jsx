import React from 'react';
import { DynamicTable } from './shared';
import VoiceRecorder from '../VoiceRecorder';

/**
 * Section 5: Reports from Village Development Committees (VDCs)
 */
const VDCReportsSection = ({ formData, onChange, onVoiceNote, voiceNotes = {}, draftContext }) => {
  const handleRowChange = (index, field, value) => {
    onChange((prev) => ({
      ...prev,
      vdc_reports: prev.vdc_reports.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addRow = () => {
    if (formData.vdc_reports.length < 10) {
      onChange((prev) => ({
        ...prev,
        vdc_reports: [...prev.vdc_reports, { vdc_name: '', issues: '', action_taken: '' }],
      }));
    }
  };

  const removeRow = (index) => {
    onChange((prev) => ({
      ...prev,
      vdc_reports: prev.vdc_reports.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Record reports from each Village Development Committee (VDC) including issues identified and actions taken.
      </p>

      <DynamicTable
        columns={[
          { name: 'vdc_name', label: 'VDC (Settlement)', type: 'text', placeholder: 'VDC name...' },
          { name: 'issues', label: 'Issues (CHIPS, CVs, outbreaks, education, WASH, etc.)', type: 'textarea', placeholder: 'Describe issues...' },
          { name: 'action_taken', label: 'Action Taken / Required', type: 'textarea', placeholder: 'Actions...' },
        ]}
        rows={formData.vdc_reports}
        onRowChange={handleRowChange}
        onAddRow={addRow}
        onRemoveRow={removeRow}
      />
      {onVoiceNote && (
        <div className="mt-3">
          <VoiceRecorder fieldName="vdc_reports" onRecordingComplete={(file) => onVoiceNote('vdc_reports', file)} existingRecording={voiceNotes.vdc_reports} draftContext={draftContext} />
        </div>
      )}
    </div>
  );
};

export default VDCReportsSection;
