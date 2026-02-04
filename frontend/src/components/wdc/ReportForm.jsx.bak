import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Save, X } from 'lucide-react';
import Button from '../common/Button';
import Alert, { InlineAlert } from '../common/Alert';
import VoiceNoteUpload from './VoiceNoteUpload';
import { submitReport } from '../../api/reports';

const ReportForm = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    report_month: new Date().toISOString().slice(0, 7), // YYYY-MM format
    meetings_held: '',
    attendees_count: '',
    issues_identified: '',
    actions_taken: '',
    challenges: '',
    recommendations: '',
    additional_notes: '',
    voice_note: null,
  });

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: submitReport,
    onSuccess: (data) => {
      onSuccess?.(data);
    },
    onError: (error) => {
      setSubmitError(error.message || 'Failed to submit report. Please try again.');
    },
  });

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  // Handle voice note change
  const handleVoiceNoteChange = (file) => {
    setFormData((prev) => ({
      ...prev,
      voice_note: file,
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.report_month) {
      newErrors.report_month = 'Report month is required';
    }

    if (!formData.meetings_held || formData.meetings_held < 0) {
      newErrors.meetings_held = 'Please enter a valid number of meetings';
    }

    if (!formData.attendees_count || formData.attendees_count < 0) {
      newErrors.attendees_count = 'Please enter a valid number of attendees';
    }

    if (!formData.issues_identified || formData.issues_identified.trim().length < 10) {
      newErrors.issues_identified = 'Please provide at least 10 characters describing the issues';
    }

    if (!formData.actions_taken || formData.actions_taken.trim().length < 10) {
      newErrors.actions_taken = 'Please provide at least 10 characters describing the actions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      setSubmitError('Please fix the errors in the form before submitting.');
      return;
    }

    // Prepare form data for submission
    const submitData = {
      report_month: formData.report_month,
      meetings_held: parseInt(formData.meetings_held, 10),
      attendees_count: parseInt(formData.attendees_count, 10),
      issues_identified: formData.issues_identified.trim(),
      actions_taken: formData.actions_taken.trim(),
      challenges: formData.challenges.trim() || 'None',
      recommendations: formData.recommendations.trim() || 'None',
      additional_notes: formData.additional_notes.trim() || '',
      voice_note: formData.voice_note,
    };

    submitMutation.mutate(submitData);
  };

  // Generate month options (current month and past 3 months)
  const getMonthOptions = () => {
    const options = [];
    const currentDate = new Date();

    for (let i = 0; i < 4; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const value = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
      options.push({ value, label });
    }

    return options;
  };

  const monthOptions = getMonthOptions();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Alert */}
      {submitError && (
        <Alert type="error" message={submitError} onClose={() => setSubmitError(null)} />
      )}

      {/* Report Month */}
      <div>
        <label htmlFor="report_month" className="block text-sm font-medium text-neutral-700 mb-2">
          Report Month <span className="text-red-600">*</span>
        </label>
        <select
          id="report_month"
          name="report_month"
          value={formData.report_month}
          onChange={handleChange}
          className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
            errors.report_month ? 'border-red-500' : 'border-neutral-300'
          }`}
          disabled={submitMutation.isPending}
        >
          {monthOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.report_month && (
          <InlineAlert type="error" message={errors.report_month} className="mt-2" />
        )}
      </div>

      {/* Meetings and Attendees Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Meetings Held */}
        <div>
          <label htmlFor="meetings_held" className="block text-sm font-medium text-neutral-700 mb-2">
            Meetings Held <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            id="meetings_held"
            name="meetings_held"
            min="0"
            value={formData.meetings_held}
            onChange={handleChange}
            placeholder="e.g., 3"
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
              errors.meetings_held ? 'border-red-500' : 'border-neutral-300'
            }`}
            disabled={submitMutation.isPending}
          />
          {errors.meetings_held && (
            <InlineAlert type="error" message={errors.meetings_held} className="mt-2" />
          )}
        </div>

        {/* Attendees Count */}
        <div>
          <label htmlFor="attendees_count" className="block text-sm font-medium text-neutral-700 mb-2">
            Total Attendees <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            id="attendees_count"
            name="attendees_count"
            min="0"
            value={formData.attendees_count}
            onChange={handleChange}
            placeholder="e.g., 150"
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
              errors.attendees_count ? 'border-red-500' : 'border-neutral-300'
            }`}
            disabled={submitMutation.isPending}
          />
          {errors.attendees_count && (
            <InlineAlert type="error" message={errors.attendees_count} className="mt-2" />
          )}
        </div>
      </div>

      {/* Issues Identified */}
      <div>
        <label htmlFor="issues_identified" className="block text-sm font-medium text-neutral-700 mb-2">
          Issues Identified <span className="text-red-600">*</span>
        </label>
        <textarea
          id="issues_identified"
          name="issues_identified"
          rows="4"
          value={formData.issues_identified}
          onChange={handleChange}
          placeholder="Describe the key issues identified in your ward during this period..."
          className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none ${
            errors.issues_identified ? 'border-red-500' : 'border-neutral-300'
          }`}
          disabled={submitMutation.isPending}
        />
        <div className="flex justify-between mt-1">
          <div>
            {errors.issues_identified && (
              <InlineAlert type="error" message={errors.issues_identified} />
            )}
          </div>
          <span className="text-xs text-neutral-500">
            {formData.issues_identified.length} characters
          </span>
        </div>
      </div>

      {/* Actions Taken */}
      <div>
        <label htmlFor="actions_taken" className="block text-sm font-medium text-neutral-700 mb-2">
          Actions Taken <span className="text-red-600">*</span>
        </label>
        <textarea
          id="actions_taken"
          name="actions_taken"
          rows="4"
          value={formData.actions_taken}
          onChange={handleChange}
          placeholder="Describe the actions your ward has taken to address the issues..."
          className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none ${
            errors.actions_taken ? 'border-red-500' : 'border-neutral-300'
          }`}
          disabled={submitMutation.isPending}
        />
        <div className="flex justify-between mt-1">
          <div>
            {errors.actions_taken && (
              <InlineAlert type="error" message={errors.actions_taken} />
            )}
          </div>
          <span className="text-xs text-neutral-500">
            {formData.actions_taken.length} characters
          </span>
        </div>
      </div>

      {/* Challenges */}
      <div>
        <label htmlFor="challenges" className="block text-sm font-medium text-neutral-700 mb-2">
          Challenges Faced
        </label>
        <textarea
          id="challenges"
          name="challenges"
          rows="3"
          value={formData.challenges}
          onChange={handleChange}
          placeholder="Describe any challenges encountered (optional)..."
          className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
          disabled={submitMutation.isPending}
        />
      </div>

      {/* Recommendations */}
      <div>
        <label htmlFor="recommendations" className="block text-sm font-medium text-neutral-700 mb-2">
          Recommendations
        </label>
        <textarea
          id="recommendations"
          name="recommendations"
          rows="3"
          value={formData.recommendations}
          onChange={handleChange}
          placeholder="Provide recommendations for improvement (optional)..."
          className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
          disabled={submitMutation.isPending}
        />
      </div>

      {/* Additional Notes */}
      <div>
        <label htmlFor="additional_notes" className="block text-sm font-medium text-neutral-700 mb-2">
          Additional Notes
        </label>
        <textarea
          id="additional_notes"
          name="additional_notes"
          rows="3"
          value={formData.additional_notes}
          onChange={handleChange}
          placeholder="Any additional information you would like to share (optional)..."
          className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
          disabled={submitMutation.isPending}
        />
      </div>

      {/* Voice Note Upload */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Voice Note (Optional)
        </label>
        <VoiceNoteUpload
          onChange={handleVoiceNoteChange}
          disabled={submitMutation.isPending}
        />
      </div>

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-neutral-200">
        <Button
          type="submit"
          icon={Save}
          loading={submitMutation.isPending}
          disabled={submitMutation.isPending}
          fullWidth
        >
          Submit Report
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            icon={X}
            onClick={onCancel}
            disabled={submitMutation.isPending}
            fullWidth
          >
            Cancel
          </Button>
        )}
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> Please ensure all required fields are filled accurately. Once submitted,
          your report will be reviewed by the LGA coordinator. You can only submit one report per month.
        </p>
      </div>
    </form>
  );
};

export default ReportForm;
