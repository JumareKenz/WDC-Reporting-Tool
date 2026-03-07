import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { NumberInput, TextInput, inputClass } from './shared';

// Donation item types (matching original form exactly)
const DONATION_ITEMS = [
  'Hospital beds', 'Mattresses', 'Medical equipment', 'Drugs/Medicines',
  'First aid supplies', 'Cleaning materials', 'Office furniture',
  'Generator/Power backup', 'Water supply equipment', 'Ambulance/Vehicle', 'Other',
];

// Repair item types (matching original form exactly)
const REPAIR_ITEMS = [
  'Building/Roofing', 'Plumbing', 'Electrical', 'Medical equipment',
  'Furniture', 'Generator', 'Water pump', 'Fencing', 'Doors/Windows', 'Other',
];

// Who can repair
const REPAIR_ACTORS = ['WDC', 'Government', 'Partners'];

/**
 * Section 3B: Health Facility Support
 * Renovations, donations, repairs
 */
const FacilitySupportSection = ({ formData, onChange, errors, onVoiceNote, voiceNotes = {}, draftContext }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange((prev) => ({ ...prev, [name]: value }));
  };

  const handleMultiSelect = (field, value) => {
    onChange((prev) => {
      const currentValues = prev[field] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
      return { ...prev, [field]: newValues };
    });
  };

  const handleRenovationChange = (index, field, value) => {
    onChange((prev) => ({
      ...prev,
      facility_renovations: (prev.facility_renovations || []).map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addRenovation = () => {
    onChange((prev) => ({
      ...prev,
      facility_renovations: [...(prev.facility_renovations || []), { facility_name: '', partner: '' }],
    }));
  };

  const removeRenovation = (index) => {
    onChange((prev) => ({
      ...prev,
      facility_renovations: (prev.facility_renovations || []).filter((_, i) => i !== index),
    }));
  };

  // Toggle repaired-by actor in items_repaired_yn array
  const handleRepairActorToggle = (actor) => {
    onChange((prev) => {
      const current = Array.isArray(prev.items_repaired_yn) ? prev.items_repaired_yn : [];
      const next = current.includes(actor)
        ? current.filter((a) => a !== actor)
        : [...current, actor];
      return { ...prev, items_repaired_yn: next.length > 0 ? next : 'No' };
    });
  };

  const renovatedYes = formData.facility_renovated === 'Yes';
  const renovationCount = parseInt(formData.facility_renovated_count) || 0;

  const wdcDonatedYes = formData.items_donated_wdc_yn === 'Yes';
  const donatedCount = parseInt(formData.items_donated_count) || 0;

  const govtDonatedYes = formData.items_donated_govt_yn === 'Yes';
  const donatedGovtCount = parseInt(formData.items_donated_govt_count) || 0;

  const repairActors = Array.isArray(formData.items_repaired_yn) ? formData.items_repaired_yn : [];
  const hasRepairs = repairActors.length > 0;
  const repairedCount = parseInt(formData.items_repaired_count) || 0;

  return (
    <div className="space-y-6">
      {/* Facilities Renovated — Yes/No → Count → Dynamic List */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-1">Facilities Renovated (last month)</h4>
        <p className="text-xs text-gray-500 mb-3">Were any health facilities renovated?</p>

        <div className="mb-3">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            Any facility renovated? <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-3">
            {['Yes', 'No'].map((opt) => (
              <label
                key={opt}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                  formData.facility_renovated === opt
                    ? 'bg-green-50 border-green-500 text-green-700 shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="facility_renovated"
                  value={opt}
                  checked={formData.facility_renovated === opt}
                  onChange={handleChange}
                  className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                />
                <span className="text-sm font-medium">{opt}</span>
              </label>
            ))}
          </div>
        </div>

        {renovatedYes && (
          <div className="space-y-3 mt-3">
            <NumberInput
              label="How many facilities were renovated?"
              name="facility_renovated_count"
              value={formData.facility_renovated_count}
              onChange={handleChange}
              min={1}
              required
            />

            {renovationCount > 0 && (
              <div className="space-y-3 mt-3">
                <label className="block text-xs sm:text-sm font-medium text-gray-700">
                  List each renovated facility and partner:
                </label>
                {(formData.facility_renovations || []).map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={item.facility_name || ''}
                        onChange={(e) => handleRenovationChange(idx, 'facility_name', e.target.value)}
                        className={inputClass}
                        placeholder="Facility name..."
                      />
                      <input
                        type="text"
                        value={item.partner || ''}
                        onChange={(e) => handleRenovationChange(idx, 'partner', e.target.value)}
                        className={inputClass}
                        placeholder="Renovated by (Govt/Partner/WDC)..."
                      />
                    </div>
                    {(formData.facility_renovations || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRenovation(idx)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors mt-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addRenovation}
                  className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Facility
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Items Donated by WDC */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <h4 className="text-sm font-semibold text-gray-800 mb-1">Items Donated by WDC</h4>
        <p className="text-xs text-gray-500 mb-3">Were any items donated to health facilities by WDC?</p>

        <div className="mb-3">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            Any items donated by WDC? <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-3">
            {['Yes', 'No'].map((opt) => (
              <label
                key={opt}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                  formData.items_donated_wdc_yn === opt
                    ? 'bg-green-50 border-green-500 text-green-700 shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="items_donated_wdc_yn"
                  value={opt}
                  checked={formData.items_donated_wdc_yn === opt}
                  onChange={handleChange}
                  className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                />
                <span className="text-sm font-medium">{opt}</span>
              </label>
            ))}
          </div>
        </div>

        {wdcDonatedYes && (
          <div className="space-y-3 mt-3">
            <TextInput
              label="Facility name (WDC donation)"
              name="items_donated_facility"
              value={formData.items_donated_facility || ''}
              onChange={handleChange}
              onVoiceNote={onVoiceNote ? (file) => onVoiceNote('items_donated_facility', file) : undefined}
              draftContext={draftContext}
              existingVoiceNote={voiceNotes.items_donated_facility}
              placeholder="Name of the health facility..."
            />
            <NumberInput label="Number of items donated" name="items_donated_count" value={formData.items_donated_count} onChange={handleChange} min={1} required />
            {donatedCount > 0 && (
              <div className="mt-2">
                <label className="block text-xs text-gray-600 mb-2 font-medium">Type of items donated: <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {DONATION_ITEMS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleMultiSelect('items_donated_types', item)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                        (formData.items_donated_types || []).includes(item)
                          ? 'bg-green-100 border-green-500 text-green-700 font-medium'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                {(formData.items_donated_types || []).includes('Other') && (
                  <div className="mt-3">
                    <TextInput
                      label="Please specify other items donated (WDC)"
                      name="items_donated_other_specify"
                      value={formData.items_donated_other_specify || ''}
                      onChange={handleChange}
                      onVoiceNote={onVoiceNote ? (file) => onVoiceNote('items_donated_other_specify', file) : undefined}
                      draftContext={draftContext}
                      existingVoiceNote={voiceNotes.items_donated_other_specify}
                      placeholder="Specify other items..."
                      required
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Items Donated by Government */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <h4 className="text-sm font-semibold text-gray-800 mb-1">Items Donated by Government</h4>
        <p className="text-xs text-gray-500 mb-3">Were any items donated to health facilities by Government?</p>

        <div className="mb-3">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            Any items donated by Government? <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-3">
            {['Yes', 'No'].map((opt) => (
              <label
                key={opt}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                  formData.items_donated_govt_yn === opt
                    ? 'bg-green-50 border-green-500 text-green-700 shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="items_donated_govt_yn"
                  value={opt}
                  checked={formData.items_donated_govt_yn === opt}
                  onChange={handleChange}
                  className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                />
                <span className="text-sm font-medium">{opt}</span>
              </label>
            ))}
          </div>
        </div>

        {govtDonatedYes && (
          <div className="space-y-3 mt-3">
            <TextInput
              label="Facility name (Government donation)"
              name="items_donated_govt_facility"
              value={formData.items_donated_govt_facility || ''}
              onChange={handleChange}
              onVoiceNote={onVoiceNote ? (file) => onVoiceNote('items_donated_govt_facility', file) : undefined}
              draftContext={draftContext}
              existingVoiceNote={voiceNotes.items_donated_govt_facility}
              placeholder="Name of the health facility..."
            />
            <NumberInput label="Number of items donated" name="items_donated_govt_count" value={formData.items_donated_govt_count} onChange={handleChange} min={1} required />
            {donatedGovtCount > 0 && (
              <div className="mt-2">
                <label className="block text-xs text-gray-600 mb-2 font-medium">Type of items donated: <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {DONATION_ITEMS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleMultiSelect('items_donated_govt_types', item)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                        (formData.items_donated_govt_types || []).includes(item)
                          ? 'bg-green-100 border-green-500 text-green-700 font-medium'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                {(formData.items_donated_govt_types || []).includes('Other') && (
                  <div className="mt-3">
                    <TextInput
                      label="Please specify other items donated (Government)"
                      name="items_donated_govt_other_specify"
                      value={formData.items_donated_govt_other_specify || ''}
                      onChange={handleChange}
                      onVoiceNote={onVoiceNote ? (file) => onVoiceNote('items_donated_govt_other_specify', file) : undefined}
                      draftContext={draftContext}
                      existingVoiceNote={voiceNotes.items_donated_govt_other_specify}
                      placeholder="Specify other items..."
                      required
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Items Repaired */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <h4 className="text-sm font-semibold text-gray-800 mb-1">Items Repaired</h4>
        <p className="text-xs text-gray-500 mb-3">Were any items in health facilities repaired?</p>

        <div className="mb-3">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            Repaired by whom? <span className="text-xs text-gray-400">(select all that apply, or leave empty for No)</span>
          </label>
          <div className="flex flex-wrap gap-3">
            {REPAIR_ACTORS.map((actor) => (
              <label
                key={actor}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                  repairActors.includes(actor)
                    ? 'bg-green-50 border-green-500 text-green-700 shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={repairActors.includes(actor)}
                  onChange={() => handleRepairActorToggle(actor)}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="text-sm font-medium">{actor}</span>
              </label>
            ))}
          </div>
        </div>

        {hasRepairs && (
          <div className="space-y-3 mt-3">
            <TextInput
              label="Facility name (repairs)"
              name="items_repaired_facility"
              value={formData.items_repaired_facility || ''}
              onChange={handleChange}
              onVoiceNote={onVoiceNote ? (file) => onVoiceNote('items_repaired_facility', file) : undefined}
              draftContext={draftContext}
              existingVoiceNote={voiceNotes.items_repaired_facility}
              placeholder="Name of the health facility..."
            />
            <NumberInput label="Number of items repaired" name="items_repaired_count" value={formData.items_repaired_count} onChange={handleChange} min={1} required />
            {repairedCount > 0 && (
              <div className="mt-2">
                <label className="block text-xs text-gray-600 mb-2 font-medium">Type of items repaired: <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {REPAIR_ITEMS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleMultiSelect('items_repaired_types', item)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                        (formData.items_repaired_types || []).includes(item)
                          ? 'bg-green-100 border-green-500 text-green-700 font-medium'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                {(formData.items_repaired_types || []).includes('Other') && (
                  <div className="mt-3">
                    <TextInput
                      label="Please specify other items repaired"
                      name="items_repaired_other_specify"
                      value={formData.items_repaired_other_specify || ''}
                      onChange={handleChange}
                      onVoiceNote={onVoiceNote ? (file) => onVoiceNote('items_repaired_other_specify', file) : undefined}
                      draftContext={draftContext}
                      existingVoiceNote={voiceNotes.items_repaired_other_specify}
                      placeholder="Specify other items..."
                      required
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FacilitySupportSection;
