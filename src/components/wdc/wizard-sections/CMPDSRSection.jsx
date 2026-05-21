import React from 'react';
import { NumberInput, TextInput } from './shared';

/**
 * Section 3D: MPDSR (Maternal and Perinatal Death Surveillance and Response)
 */
const CMPDSRSection = ({ formData, onChange, onVoiceNote, voiceNotes = {}, draftContext }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange((prev) => ({ ...prev, [name]: value }));
  };

  const handleCauseChange = (type, index, value) => {
    const field = type === 'maternal' ? 'maternal_death_causes' : 'perinatal_death_causes';
    onChange((prev) => {
      const causes = [...(prev[field] || ['', '', ''])];
      causes[index] = value;
      return { ...prev, [field]: causes };
    });
  };

  const maternalDeaths = parseInt(formData.maternal_deaths) || 0;
  const perinatalDeaths = parseInt(formData.perinatal_deaths) || 0;

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Maternal and Perinatal Death Surveillance and Response (MPDSR). Record deaths and causes identified by the community.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <NumberInput
            label="Number of Maternal Deaths (last month)"
            name="maternal_deaths"
            value={formData.maternal_deaths}
            onChange={handleChange}
            required
          />
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <NumberInput
            label="Number of Perinatal Deaths (last month)"
            name="perinatal_deaths"
            value={formData.perinatal_deaths}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {maternalDeaths > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-3">
              Causes of maternal deaths identified by community:
            </h4>
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <TextInput
                  key={i}
                  label={`Cause ${i + 1}`}
                  name={`maternal_death_cause_${i}`}
                  value={(formData.maternal_death_causes || ['', '', ''])[i] || ''}
                  onChange={(e) => handleCauseChange('maternal', i, e.target.value)}
                  onVoiceNote={onVoiceNote ? (file) => onVoiceNote(`maternal_death_cause_${i}`, file) : undefined}
                  draftContext={draftContext}
                  existingVoiceNote={voiceNotes[`maternal_death_cause_${i}`]}
                  placeholder="Enter cause..."
                />
              ))}
            </div>
          </div>
        )}
        {perinatalDeaths > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-3">
              Causes of perinatal deaths identified by community:
            </h4>
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <TextInput
                  key={i}
                  label={`Cause ${i + 1}`}
                  name={`perinatal_death_cause_${i}`}
                  value={(formData.perinatal_death_causes || ['', '', ''])[i] || ''}
                  onChange={(e) => handleCauseChange('perinatal', i, e.target.value)}
                  onVoiceNote={onVoiceNote ? (file) => onVoiceNote(`perinatal_death_cause_${i}`, file) : undefined}
                  draftContext={draftContext}
                  existingVoiceNote={voiceNotes[`perinatal_death_cause_${i}`]}
                  placeholder="Enter cause..."
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CMPDSRSection;
