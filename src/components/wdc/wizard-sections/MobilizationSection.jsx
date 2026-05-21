import React, { useCallback } from 'react';
import { TextInput } from './shared';

/**
 * Section 6: Community Mobilization Activities
 */
const MobilizationSection = ({ formData, onChange, onVoiceNote, voiceNotes = {}, draftContext }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange((prev) => ({ ...prev, [name]: value }));
  };

  // Stable callbacks for VoiceRecorder to prevent re-renders during typing
  // This fixes mobile keyboard dismissal caused by parent re-renders
  const handleVoiceNoteAwareness = useCallback(
    (file) => onVoiceNote('awareness_topic', file),
    [onVoiceNote]
  );
  const handleVoiceNoteTraditional = useCallback(
    (file) => onVoiceNote('traditional_leaders_support', file),
    [onVoiceNote]
  );
  const handleVoiceNoteReligious = useCallback(
    (file) => onVoiceNote('religious_leaders_support', file),
    [onVoiceNote]
  );

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
        onVoiceNote={onVoiceNote ? handleVoiceNoteAwareness : undefined}
        draftContext={draftContext}
        existingVoiceNote={voiceNotes.awareness_topic}
        placeholder="Enter awareness topic..."
        required
      />

      <TextInput
        label="Support Needed/Given by Traditional Leaders"
        name="traditional_leaders_support"
        type="textarea"
        value={formData.traditional_leaders_support}
        onChange={handleChange}
        onVoiceNote={onVoiceNote ? handleVoiceNoteTraditional : undefined}
        draftContext={draftContext}
        existingVoiceNote={voiceNotes.traditional_leaders_support}
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
        onVoiceNote={onVoiceNote ? handleVoiceNoteReligious : undefined}
        draftContext={draftContext}
        existingVoiceNote={voiceNotes.religious_leaders_support}
        placeholder="Describe support needed/given by religious leaders..."
        rows={3}
        required
      />
    </div>
  );
};

export default MobilizationSection;
