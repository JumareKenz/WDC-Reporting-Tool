import React from 'react';
import { DynamicTable } from './shared';

/**
 * Section 2: Action Tracker (Feedback from last meeting)
 */
const ActionTrackerSection = ({ formData, onChange, errors }) => {
  const handleRowChange = (index, field, value) => {
    onChange((prev) => ({
      ...prev,
      action_tracker: prev.action_tracker.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addRow = () => {
    if (formData.action_tracker.length < 10) {
      onChange((prev) => ({
        ...prev,
        action_tracker: [
          ...prev.action_tracker,
          { action_point: '', status: '', challenges: '', timeline: '', responsible_person: '' },
        ],
      }));
    }
  };

  const removeRow = (index) => {
    onChange((prev) => ({
      ...prev,
      action_tracker: prev.action_tracker.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Track action points from the last meeting. Record status, challenges, and responsible persons.
      </p>

      <DynamicTable
        columns={[
          { name: 'action_point', label: 'Agreed Action Point', type: 'textarea', placeholder: 'Enter action...' },
          { name: 'challenges', label: 'Challenges', type: 'textarea', placeholder: 'Any challenges...' },
          { name: 'timeline', label: 'Timeline', type: 'text', placeholder: 'e.g., 2 weeks' },
          { name: 'responsible_person', label: 'Responsible Person', type: 'text', placeholder: 'Name...' },
          { name: 'status', label: 'Status', type: 'select', options: ['Completed', 'On-going', 'Not Started'] },
        ]}
        rows={formData.action_tracker}
        onRowChange={handleRowChange}
        onAddRow={addRow}
        onRemoveRow={removeRow}
      />
    </div>
  );
};

export default ActionTrackerSection;
