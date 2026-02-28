import React from 'react';
import { Building, MapPin, Users } from 'lucide-react';
import { inputClass, inputErrorClass } from './shared';

/**
 * Section 0 (Header): Meeting Details
 * Fields: state, lga_id, ward_id, report_date, report_time, meeting_type, agenda checkboxes
 */
const MeetingDetailsSection = ({ formData, onChange, errors, userLGA, userWard }) => {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    onChange((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <div className="space-y-6">
      {/* User Assignment Display - Read-only */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 sm:p-5 rounded-xl shadow-md -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-6">
        <h3 className="text-base sm:text-lg font-bold mb-3">KADUNA STATE WDC MONTHLY REPORT</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white/10 rounded-lg p-3 border border-white/20">
            <label className="block text-xs font-medium text-green-200 mb-1">State (Auto-assigned)</label>
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-green-200" />
              <span className="font-semibold text-sm">Kaduna State</span>
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 border border-white/20">
            <label className="block text-xs font-medium text-green-200 mb-1">LGA (Auto-assigned)</label>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-200" />
              <span className="font-semibold text-sm">{formData._userLGA?.name || 'Not assigned'}</span>
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 border border-white/20">
            <label className="block text-xs font-medium text-green-200 mb-1">Ward (Auto-assigned)</label>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-green-200" />
              <span className="font-semibold text-sm">{formData._userWard?.name || 'Not assigned'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="wiz-report_date" className="block text-xs sm:text-sm font-medium text-gray-700">
            Report Date
          </label>
          <input
            id="wiz-report_date"
            type="date"
            name="report_date"
            value={formData.report_date}
            onChange={handleChange}
            className={errors.report_date ? inputErrorClass : inputClass}
          />
          {errors.report_date && (
            <p className="text-xs text-red-600 font-medium">{errors.report_date}</p>
          )}
        </div>
        <div className="space-y-1">
          <label htmlFor="wiz-report_time" className="block text-xs sm:text-sm font-medium text-gray-700">
            Report Time
          </label>
          <input
            id="wiz-report_time"
            type="time"
            name="report_time"
            value={formData.report_time}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
      </div>

      {/* Meeting Type */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
          Meeting Type <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-3">
          {['Monthly', 'Emergency', 'Quarterly Town Hall'].map((type) => (
            <label
              key={type}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                formData.meeting_type === type
                  ? 'bg-green-50 border-green-500 text-green-700 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="meeting_type"
                value={type}
                checked={formData.meeting_type === type}
                onChange={handleChange}
                className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
              />
              <span className="text-xs sm:text-sm font-medium">{type}</span>
            </label>
          ))}
        </div>
        {errors.meeting_type && (
          <p className="text-xs text-red-600 font-medium mt-1">{errors.meeting_type}</p>
        )}
      </div>

      {/* Standard Agenda */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
          Standard Agenda (Check items covered)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { name: 'agenda_opening_prayer', label: 'Opening Prayer / Remarks' },
            { name: 'agenda_minutes', label: 'Minutes of the last meeting' },
            { name: 'agenda_action_tracker', label: 'Action Tracker / Matters arising' },
            { name: 'agenda_reports', label: 'Reports: Health services & Village areas' },
            { name: 'agenda_action_plan', label: 'Update On Action Plan' },
            { name: 'agenda_aob', label: 'Any Other Business (AOB)' },
            { name: 'agenda_closing', label: 'Closing' },
          ].map((item) => (
            <label
              key={item.name}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                formData[item.name]
                  ? 'bg-green-50 border-green-300'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                name={item.name}
                checked={!!formData[item.name]}
                onChange={handleChange}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="text-xs sm:text-sm text-gray-700">{item.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MeetingDetailsSection;
