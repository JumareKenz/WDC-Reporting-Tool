import React from 'react';
import { inputClass } from './shared';

/**
 * Section 4: Community Involvement & Town Hall Feedback
 * Only appears for 'Quarterly Town Hall' meetings.
 */
const CommunityFeedbackSection = ({ formData, onChange }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange((prev) => ({ ...prev, [name]: value }));
  };

  const handleFeedbackChange = (index, field, value) => {
    onChange((prev) => ({
      ...prev,
      community_feedback: prev.community_feedback.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const showFeedback = formData.town_hall_conducted === 'Yes';

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Record feedback from the Quarterly Town Hall meeting.
      </p>

      {/* Town Hall Conducted */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
          Quarterly Town Hall Conducted? <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-3">
          {['Yes', 'No'].map((opt) => (
            <label
              key={opt}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                formData.town_hall_conducted === opt
                  ? 'bg-green-50 border-green-500 text-green-700 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="town_hall_conducted"
                value={opt}
                checked={formData.town_hall_conducted === opt}
                onChange={handleChange}
                className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
              />
              <span className="text-sm font-medium">{opt}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Feedback Items — only when town hall conducted */}
      {showFeedback && (
        <div className="space-y-3">
          {(formData.community_feedback || []).map((item, idx) => (
            <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-sm font-semibold text-gray-800 mb-3">
                {item.indicator} <span className="text-red-500">*</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-600">
                    Feedback / Observation <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={item.feedback}
                    onChange={(e) => handleFeedbackChange(idx, 'feedback', e.target.value)}
                    className={`${inputClass} resize-none`}
                    rows={2}
                    placeholder="Feedback..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-600">
                    Action Required <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={item.action_required}
                    onChange={(e) => handleFeedbackChange(idx, 'action_required', e.target.value)}
                    className={`${inputClass} resize-none`}
                    rows={2}
                    placeholder="Action required..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommunityFeedbackSection;
