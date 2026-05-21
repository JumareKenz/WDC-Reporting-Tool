import React from 'react';
import { DynamicTable } from './shared';
import VoiceRecorder from '../VoiceRecorder';

/**
 * Section 7: Community Action Plan
 */
const ActionPlanSection = ({ formData, onChange, onVoiceNote, voiceNotes = {}, draftContext }) => {
  const handleRowChange = (index, field, value) => {
    onChange((prev) => ({
      ...prev,
      action_plan: prev.action_plan.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addRow = () => {
    if (formData.action_plan.length < 10) {
      onChange((prev) => ({
        ...prev,
        action_plan: [
          ...prev.action_plan,
          { issue: '', action: '', timeline: '', responsible_person: '' },
        ],
      }));
    }
  };

  const removeRow = (index) => {
    onChange((prev) => ({
      ...prev,
      action_plan: prev.action_plan.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Document the community action plan with issues identified, agreed actions, timelines, and responsible persons.
      </p>

      <DynamicTable
        columns={[
          { name: 'issue', label: 'Issues Identified', type: 'textarea', placeholder: 'Describe issue...' },
          { name: 'action', label: 'Actions Agreed', type: 'textarea', placeholder: 'Action to take...' },
          { name: 'timeline', label: 'Timeline', type: 'text', placeholder: 'e.g., 2 weeks' },
          { name: 'responsible_person', label: 'Responsible Person', type: 'text', placeholder: 'Name...' },
        ]}
        rows={formData.action_plan}
        onRowChange={handleRowChange}
        onAddRow={addRow}
        onRemoveRow={removeRow}
      />
      {onVoiceNote && (
        <div className="mt-3">
          <VoiceRecorder fieldName="action_plan" onRecordingComplete={(file) => onVoiceNote('action_plan', file)} existingRecording={voiceNotes.action_plan} draftContext={draftContext} />
        </div>
      )}
    </div>
  );
};

export default ActionPlanSection;
