import React from 'react';
import { TextInput } from './shared';

/**
 * Section 6: Community Mobilization Activities
 */
const MobilizationSection = ({ formData, onChange, onVoiceNote }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600">
        Record community awareness topics and support needed/given by traditional and religious leaders.
      </p>

      <TextInput
        label="Awareness Topic"
        name="awareness_topic"
        value={formData.awareness_topic}
        onChange={handleChange}
        onVoiceNote={onVoiceNote ? (file) => onVoiceNote('awareness_topic', file) : undefined}
        placeholder="Enter awareness topic..."
        required
      />

      <TextInput
        label="Support Needed/Given by Traditional Leaders"
        name="traditional_leaders_support"
        type="textarea"
        value={formData.traditional_leaders_support}
        onChange={handleChange}
        onVoiceNote={onVoiceNote ? (file) => onVoiceNote('traditional_leaders_support', file) : undefined}
        placeholder="Describe support needed/given by traditional leaders..."
        rows={3}
        required
      />

      <TextInput
        label="Support Needed/Given by Religious Leaders"
        name="religious_leaders_support"
        type="textarea"
        value={formData.religious_leaders_support}
        onChange={handleChange}
        onVoiceNote={onVoiceNote ? (file) => onVoiceNote('religious_leaders_support', file) : undefined}
        placeholder="Describe support needed/given by religious leaders..."
        rows={3}
        required
      />
    </div>
  );
};

export default MobilizationSection;
