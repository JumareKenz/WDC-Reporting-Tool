import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  FileText,
  CheckCircle,
  Plus,
  Trash2,
  Send,
  ChevronDown,
  ChevronUp,
  Building,
  MapPin,
  Users,
  Heart,
  MessageSquare,
  Calendar,
  AlertTriangle,
  Upload,
  Image,
  X,
} from 'lucide-react';
import Button from '../common/Button';
import Alert from '../common/Alert';
import VoiceRecorder from './VoiceRecorder';
import apiClient from '../../api/client';

// Kaduna LGAs data
const KADUNA_LGAS = [
  { id: 1, name: 'Birnin Gwari' },
  { id: 2, name: 'Chikun' },
  { id: 3, name: 'Giwa' },
  { id: 4, name: 'Igabi' },
  { id: 5, name: 'Ikara' },
  { id: 6, name: 'Jaba' },
  { id: 7, name: "Jema'a" },
  { id: 8, name: 'Kachia' },
  { id: 9, name: 'Kaduna North' },
  { id: 10, name: 'Kaduna South' },
  { id: 11, name: 'Kagarko' },
  { id: 12, name: 'Kajuru' },
  { id: 13, name: 'Kaura' },
  { id: 14, name: 'Kauru' },
  { id: 15, name: 'Kubau' },
  { id: 16, name: 'Kudan' },
  { id: 17, name: 'Lere' },
  { id: 18, name: 'Makarfi' },
  { id: 19, name: 'Sabon Gari' },
  { id: 20, name: 'Sanga' },
  { id: 21, name: 'Soba' },
  { id: 22, name: 'Zangon Kataf' },
  { id: 23, name: 'Zaria' },
];

// Donation item types
const DONATION_ITEMS = [
  'Hospital beds', 'Mattresses', 'Medical equipment', 'Drugs/Medicines',
  'First aid supplies', 'Cleaning materials', 'Office furniture',
  'Generator/Power backup', 'Water supply equipment', 'Ambulance/Vehicle', 'Other',
];

// Repair item types
const REPAIR_ITEMS = [
  'Building/Roofing', 'Plumbing', 'Electrical', 'Medical equipment',
  'Furniture', 'Generator', 'Water pump', 'Fencing', 'Doors/Windows', 'Other',
];

// Section component for collapsible sections
const FormSection = ({ title, number, icon: Icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-primary-50 to-white hover:from-primary-100 transition-colors"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary-600 text-white text-xs sm:text-sm font-bold">
            {number}
          </div>
          {Icon && <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />}
          <h3 className="text-sm sm:text-lg font-semibold text-neutral-900 text-left">{title}</h3>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-neutral-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-neutral-500 flex-shrink-0" />
        )}
      </button>
      {isOpen && <div className="p-4 sm:p-6 border-t border-neutral-100">{children}</div>}
    </div>
  );
};

// Input with voice note
const InputWithVoice = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onVoiceNote,
  placeholder,
  required = false,
  error,
  helpText,
  rows,
  ...props
}) => {
  const inputId = `field-${name}`;
  const isTextarea = type === 'textarea';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="block text-xs sm:text-sm font-medium text-neutral-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <VoiceRecorder
          fieldName={name}
          onRecordingComplete={onVoiceNote}
          compact
        />
      </div>
      {isTextarea ? (
        <textarea
          id={inputId}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows || 3}
          className={`w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none ${error ? 'border-red-500' : ''}`}
          {...props}
        />
      ) : (
        <input
          id={inputId}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${error ? 'border-red-500' : ''}`}
          {...props}
        />
      )}
      {helpText && <p className="text-xs text-neutral-500">{helpText}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};

// Number input with voice note
const NumberInputWithVoice = ({ label, name, value, onChange, onVoiceNote, min = 0, ...props }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between gap-2">
      <label className="block text-xs sm:text-sm font-medium text-neutral-700 truncate">{label}</label>
      <VoiceRecorder fieldName={name} onRecordingComplete={onVoiceNote} compact />
    </div>
    <input
      type="number"
      name={name}
      value={value}
      onChange={onChange}
      min={min}
      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      {...props}
    />
  </div>
);

// Mobile-friendly dynamic table with voice recording - card layout on mobile
const DynamicTable = ({ columns, rows, onRowChange, onAddRow, onRemoveRow, onVoiceNote, tableId, maxRows = 10 }) => (
  <div>
    {/* Desktop Table */}
    <div className="hidden sm:block overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-neutral-50">
            <th className="border border-neutral-200 px-2 py-2 text-left text-xs font-semibold text-neutral-700 w-10">
              SN
            </th>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className="border border-neutral-200 px-2 py-2 text-left text-xs font-semibold text-neutral-700"
              >
                {col.label}
              </th>
            ))}
            <th className="border border-neutral-200 px-2 py-2 text-center text-xs font-semibold text-neutral-700 w-12">
              Del
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-neutral-50">
              <td className="border border-neutral-200 px-2 py-1 text-center font-medium">
                {rowIdx + 1}
              </td>
              {columns.map((col, colIdx) => (
                <td key={colIdx} className="border border-neutral-200 px-1 py-1">
                  <div className="flex items-start gap-1">
                    <div className="flex-1">
                      {col.type === 'select' ? (
                        <select
                          value={row[col.name] || ''}
                          onChange={(e) => onRowChange(rowIdx, col.name, e.target.value)}
                          className="w-full px-2 py-1 text-xs border-0 focus:ring-1 focus:ring-primary-500 rounded"
                        >
                          <option value="">Select...</option>
                          {col.options.map((opt, i) => (
                            <option key={i} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : col.type === 'textarea' ? (
                        <textarea
                          value={row[col.name] || ''}
                          onChange={(e) => onRowChange(rowIdx, col.name, e.target.value)}
                          className="w-full px-2 py-1 text-xs border-0 focus:ring-1 focus:ring-primary-500 rounded resize-none"
                          rows={2}
                          placeholder={col.placeholder}
                        />
                      ) : (
                        <input
                          type={col.type || 'text'}
                          value={row[col.name] || ''}
                          onChange={(e) => onRowChange(rowIdx, col.name, e.target.value)}
                          className="w-full px-2 py-1 text-xs border-0 focus:ring-1 focus:ring-primary-500 rounded"
                          placeholder={col.placeholder}
                        />
                      )}
                    </div>
                    {col.type !== 'select' && onVoiceNote && (
                      <VoiceRecorder
                        fieldName={`${tableId}_${rowIdx}_${col.name}`}
                        onRecordingComplete={(file) => onVoiceNote(`${tableId}_${rowIdx}_${col.name}`, file)}
                        compact
                      />
                    )}
                  </div>
                </td>
              ))}
              <td className="border border-neutral-200 px-1 py-1 text-center">
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveRow(rowIdx)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Mobile Card Layout */}
    <div className="sm:hidden space-y-4">
      {rows.map((row, rowIdx) => (
        <div key={rowIdx} className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-primary-600">Item #{rowIdx + 1}</span>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => onRemoveRow(rowIdx)}
                className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="space-y-3">
            {columns.map((col, colIdx) => (
              <div key={colIdx}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-xs font-medium text-neutral-600">
                    {col.label}
                  </label>
                  {col.type !== 'select' && onVoiceNote && (
                    <VoiceRecorder
                      fieldName={`${tableId}_${rowIdx}_${col.name}`}
                      onRecordingComplete={(file) => onVoiceNote(`${tableId}_${rowIdx}_${col.name}`, file)}
                      compact
                    />
                  )}
                </div>
                {col.type === 'select' ? (
                  <select
                    value={row[col.name] || ''}
                    onChange={(e) => onRowChange(rowIdx, col.name, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-primary-500"
                  >
                    <option value="">Select...</option>
                    {col.options.map((opt, i) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : col.type === 'textarea' ? (
                  <textarea
                    value={row[col.name] || ''}
                    onChange={(e) => onRowChange(rowIdx, col.name, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-primary-500 resize-none"
                    rows={2}
                    placeholder={col.placeholder}
                  />
                ) : (
                  <input
                    type={col.type || 'text'}
                    value={row[col.name] || ''}
                    onChange={(e) => onRowChange(rowIdx, col.name, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-primary-500"
                    placeholder={col.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>

    {rows.length < maxRows && (
      <button
        type="button"
        onClick={onAddRow}
        className="mt-3 flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
      >
        <Plus className="w-4 h-4" />
        Add Row
      </button>
    )}
  </div>
);

/**
 * Comprehensive WDC Monthly Report Form
 */
const WDCReportForm = ({ onSuccess, onCancel, userWard, userLGA }) => {
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [voiceNotes, setVoiceNotes] = useState({});
  const [attendancePictures, setAttendancePictures] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    // Header
    state: 'Kaduna State',
    lga_id: userLGA?.id || '',
    ward_id: userWard?.id || '',
    report_date: new Date().toISOString().split('T')[0],
    report_time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),

    // Section 1: Agenda & Governance
    meeting_type: 'Monthly',
    agenda_opening_prayer: true,
    agenda_minutes: true,
    agenda_action_tracker: true,
    agenda_reports: true,
    agenda_action_plan: true,
    agenda_aob: true,
    agenda_closing: true,

    // Section 2: Action Tracker
    action_tracker: [
      { action_point: '', status: '', challenges: '', timeline: '', responsible_person: '' },
    ],

    // Section 3A: General Attendance (Health Data)
    health_opd_number: '',
    health_penta1: '',
    health_bcg: '',
    health_penta3: '',
    health_measles: '',
    health_malaria_under5: '',
    health_diarrhea_under5: '',
    health_anc_number: '',
    health_anc_first_visit: '',
    health_anc_fourth_visit: '',
    health_anc_eighth_visit: '',
    health_deliveries: '',
    health_postnatal: '',
    health_fp_counselling: '',
    health_fp_new_acceptors: '',
    health_hepb_tested: '',
    health_hepb_positive: '',
    health_tb_presumptive: '',
    health_tb_on_treatment: '',

    // Section 3B: Health Facility Support
    facilities_renovated_govt: '',
    facilities_renovated_partners: '',
    facilities_renovated_wdc: '',
    items_donated_count: '',
    items_donated_types: [],
    items_repaired_count: '',
    items_repaired_types: [],

    // Section 3C: Transportation & Emergency
    women_transported_anc: '',
    women_transported_delivery: '',
    children_transported_danger: '',
    women_supported_delivery_items: '',

    // Section 3D: cMPDSR
    maternal_deaths: '',
    perinatal_deaths: '',
    maternal_death_causes: ['', '', ''],
    perinatal_death_causes: ['', '', ''],

    // Section 4: Community Feedback
    town_hall_conducted: '',
    community_feedback: [
      { indicator: 'Health Workers\' Attitude', feedback: '', action_required: '' },
      { indicator: 'Waiting Time', feedback: '', action_required: '' },
      { indicator: 'Service Charges / Fees', feedback: '', action_required: '' },
      { indicator: 'Client Satisfaction', feedback: '', action_required: '' },
      { indicator: 'Others', feedback: '', action_required: '' },
    ],

    // Section 5: VDC Reports
    vdc_reports: [
      { vdc_name: '', issues: '', action_taken: '' },
    ],

    // Section 6: Community Mobilization
    awareness_theme: '',
    traditional_leaders_support: '',
    religious_leaders_support: '',

    // Section 7: Community Action Plan
    action_plan: [
      { issue: '', action: '', timeline: '', responsible_person: '' },
    ],

    // Section 8: Support & Conclusion
    support_required: '',
    aob: '',
    attendance_total: '',
    attendance_male: '',
    attendance_female: '',
    next_meeting_date: '',
    chairman_signature: '',
    secretary_signature: '',
  });

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Handle voice note
  const handleVoiceNote = (fieldName, file) => {
    setVoiceNotes(prev => ({
      ...prev,
      [fieldName]: file,
    }));
  };

  // Handle action tracker changes
  const handleActionTrackerChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      action_tracker: prev.action_tracker.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addActionTrackerRow = () => {
    if (formData.action_tracker.length < 10) {
      setFormData(prev => ({
        ...prev,
        action_tracker: [
          ...prev.action_tracker,
          { action_point: '', status: '', challenges: '', timeline: '', responsible_person: '' },
        ],
      }));
    }
  };

  const removeActionTrackerRow = (index) => {
    setFormData(prev => ({
      ...prev,
      action_tracker: prev.action_tracker.filter((_, i) => i !== index),
    }));
  };

  // Handle community feedback changes
  const handleFeedbackChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      community_feedback: prev.community_feedback.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  // Handle VDC reports changes
  const handleVDCChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      vdc_reports: prev.vdc_reports.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addVDCRow = () => {
    if (formData.vdc_reports.length < 10) {
      setFormData(prev => ({
        ...prev,
        vdc_reports: [...prev.vdc_reports, { vdc_name: '', issues: '', action_taken: '' }],
      }));
    }
  };

  const removeVDCRow = (index) => {
    setFormData(prev => ({
      ...prev,
      vdc_reports: prev.vdc_reports.filter((_, i) => i !== index),
    }));
  };

  // Handle action plan changes
  const handleActionPlanChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      action_plan: prev.action_plan.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addActionPlanRow = () => {
    if (formData.action_plan.length < 10) {
      setFormData(prev => ({
        ...prev,
        action_plan: [
          ...prev.action_plan,
          { issue: '', action: '', timeline: '', responsible_person: '' },
        ],
      }));
    }
  };

  const removeActionPlanRow = (index) => {
    setFormData(prev => ({
      ...prev,
      action_plan: prev.action_plan.filter((_, i) => i !== index),
    }));
  };

  // Handle multi-select for donation/repair types
  const handleMultiSelect = (field, value) => {
    setFormData(prev => {
      const currentValues = prev[field] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      return { ...prev, [field]: newValues };
    });
  };

  // Handle picture upload for attendance
  const handlePictureUpload = (e) => {
    const files = Array.from(e.target.files);
    const newPictures = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
    }));
    setAttendancePictures(prev => [...prev, ...newPictures]);
  };

  // Handle picture removal
  const handleRemovePicture = (index) => {
    setAttendancePictures(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data) => {
      const formPayload = new FormData();
      formPayload.append('report_data', JSON.stringify(data));

      Object.entries(voiceNotes).forEach(([fieldName, file]) => {
        if (file) {
          formPayload.append(`voice_${fieldName}`, file);
        }
      });

      // Add attendance pictures
      attendancePictures.forEach((pic, index) => {
        formPayload.append(`attendance_picture_${index}`, pic.file);
      });

      const response = await apiClient.post('/reports', formPayload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response;
    },
    onSuccess: () => {
      setSubmitSuccess(true);
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    },
    onError: (error) => {
      setSubmitError(error.message || 'Failed to submit report');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!formData.meeting_type) {
      setSubmitError('Please select a meeting type');
      return;
    }

    submitMutation.mutate(formData);
  };

  if (submitSuccess) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-neutral-900 mb-2">Report Submitted Successfully!</h3>
        <p className="text-neutral-600">Your WDC monthly report has been recorded.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      {/* Header Alert */}
      <Alert
        type="info"
        title="WDC Monthly Report Form"
        message="Complete all sections. Use the microphone icon next to each field to add voice notes."
      />

      {submitError && (
        <Alert
          type="error"
          message={submitError}
          onClose={() => setSubmitError(null)}
        />
      )}

      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4 sm:p-6 rounded-xl shadow-lg">
        <h2 className="text-lg sm:text-2xl font-bold mb-4">KADUNA STATE WDC MONTHLY REPORT</h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs sm:text-sm font-medium text-primary-100 mb-1">State</label>
            <div className="px-3 py-2 bg-white/10 rounded-lg text-white font-medium text-sm">
              Kaduna State
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs sm:text-sm font-medium text-primary-100 mb-1">LGA</label>
            <select
              name="lga_id"
              value={formData.lga_id}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:ring-2 focus:ring-white/50"
            >
              <option value="" className="text-neutral-900">Select LGA</option>
              {KADUNA_LGAS.map(lga => (
                <option key={lga.id} value={lga.id} className="text-neutral-900">
                  {lga.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-primary-100 mb-1">Ward</label>
            <input
              type="text"
              value={userWard?.name || 'Auto-detected'}
              disabled
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-primary-100 mb-1">Date</label>
              <input
                type="date"
                name="report_date"
                value={formData.report_date}
                onChange={handleChange}
                className="w-full px-2 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-primary-100 mb-1">Time</label>
              <input
                type="time"
                name="report_time"
                value={formData.report_time}
                onChange={handleChange}
                className="w-full px-2 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-xs sm:text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: Agenda & Governance */}
      <FormSection title="AGENDA & GOVERNANCE" number="1" icon={FileText} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-neutral-700 mb-2">
              Meeting Type <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              {['Monthly', 'Emergency', 'Quarterly Town Hall'].map(type => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="meeting_type"
                    value={type}
                    checked={formData.meeting_type === type}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary-600 border-neutral-300 focus:ring-primary-500"
                  />
                  <span className="text-xs sm:text-sm text-neutral-700">{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-neutral-700 mb-2">
              Standard Agenda (Check items covered)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {[
                { name: 'agenda_opening_prayer', label: 'Opening Prayer / Remarks' },
                { name: 'agenda_minutes', label: 'Minutes of the last meeting' },
                { name: 'agenda_action_tracker', label: 'Action Tracker / Matters arising' },
                { name: 'agenda_reports', label: 'Reports: Health services & Village areas' },
                { name: 'agenda_action_plan', label: 'Update On Action Plan' },
                { name: 'agenda_aob', label: 'Any Other Business (AOB)' },
                { name: 'agenda_closing', label: 'Closing' },
              ].map(item => (
                <label key={item.name} className="flex items-center gap-2 p-2 sm:p-3 rounded-lg bg-neutral-50 hover:bg-neutral-100 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    name={item.name}
                    checked={formData[item.name]}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-xs sm:text-sm text-neutral-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </FormSection>

      {/* Section 2: Action Tracker */}
      <FormSection title="ACTION TRACKER (Feedback from last meeting)" number="2" icon={CheckCircle}>
        <DynamicTable
          tableId="action_tracker"
          columns={[
            { name: 'action_point', label: 'Agreed Action Point', type: 'textarea', placeholder: 'Enter action...' },
            { name: 'status', label: 'Status (Completed/On-going/Not Started)', type: 'select', options: ['Completed', 'On-going', 'Not Started'] },
            { name: 'challenges', label: 'Challenges', type: 'textarea', placeholder: 'Any challenges...' },
            { name: 'timeline', label: 'Timeline', type: 'text', placeholder: 'e.g., 2 weeks' },
            { name: 'responsible_person', label: 'Responsible Person', type: 'text', placeholder: 'Name...' },
          ]}
          rows={formData.action_tracker}
          onRowChange={handleActionTrackerChange}
          onAddRow={addActionTrackerRow}
          onRemoveRow={removeActionTrackerRow}
          onVoiceNote={handleVoiceNote}
        />
      </FormSection>

      {/* Section 3: Report on Health System */}
      <FormSection title="REPORT ON HEALTH SYSTEM" number="3" icon={Heart}>
        <div className="space-y-6">
          {/* 3A: General Attendance */}
          <div>
            <h4 className="text-sm sm:text-md font-semibold text-neutral-800 mb-4 pb-2 border-b border-neutral-200">
              3A. GENERAL ATTENDANCE
            </h4>

            <h5 className="text-xs sm:text-sm font-semibold text-neutral-700 mb-3">OPD</h5>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <NumberInputWithVoice label="PENTA1" name="health_penta1" value={formData.health_penta1} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('health_penta1', file)} />
              <NumberInputWithVoice label="BCG" name="health_bcg" value={formData.health_bcg} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('health_bcg', file)} />
              <NumberInputWithVoice label="PENTA3" name="health_penta3" value={formData.health_penta3} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('health_penta3', file)} />
              <NumberInputWithVoice label="MEASLES" name="health_measles" value={formData.health_measles} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('health_measles', file)} />
            </div>

            <h5 className="text-xs sm:text-sm font-semibold text-neutral-700 mt-6 mb-3">OPD (Under 5)</h5>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <NumberInputWithVoice label="MALARIA UNDER 5" name="health_malaria_under5" value={formData.health_malaria_under5} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('health_malaria_under5', file)} />
              <NumberInputWithVoice label="DIARRHEA UNDER 5" name="health_diarrhea_under5" value={formData.health_diarrhea_under5} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('health_diarrhea_under5', file)} />
            </div>

            <h5 className="text-xs sm:text-sm font-semibold text-neutral-700 mt-6 mb-3">ANC</h5>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <NumberInputWithVoice label="First Visit" name="health_anc_first_visit" value={formData.health_anc_first_visit} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('health_anc_first_visit', file)} />
              <NumberInputWithVoice label="Fourth Visit" name="health_anc_fourth_visit" value={formData.health_anc_fourth_visit} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('health_anc_fourth_visit', file)} />
              <NumberInputWithVoice label="Eight Visit" name="health_anc_eighth_visit" value={formData.health_anc_eighth_visit} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('health_anc_eighth_visit', file)} />
            </div>

            <h5 className="text-xs sm:text-sm font-semibold text-neutral-700 mt-6 mb-3">Labour, Deliveries & Post-Natal</h5>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <NumberInputWithVoice label="Deliveries" name="health_deliveries" value={formData.health_deliveries} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('health_deliveries', file)} />
              <NumberInputWithVoice label="Post-Natal" name="health_postnatal" value={formData.health_postnatal} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('health_postnatal', file)} />
            </div>

            <h5 className="text-xs sm:text-sm font-semibold text-neutral-700 mt-6 mb-3">Family Planning</h5>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <NumberInputWithVoice label="Counselling" name="health_fp_counselling" value={formData.health_fp_counselling} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('health_fp_counselling', file)} />
              <NumberInputWithVoice label="New Acceptors" name="health_fp_new_acceptors" value={formData.health_fp_new_acceptors} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('health_fp_new_acceptors', file)} />
            </div>

            <h5 className="text-xs sm:text-sm font-semibold text-neutral-700 mt-6 mb-3">HEP B</h5>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <NumberInputWithVoice label="Person Tested" name="health_hepb_tested" value={formData.health_hepb_tested} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('health_hepb_tested', file)} />
              <NumberInputWithVoice label="Person Tested Positive" name="health_hepb_positive" value={formData.health_hepb_positive} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('health_hepb_positive', file)} />
            </div>

            <h5 className="text-xs sm:text-sm font-semibold text-neutral-700 mt-6 mb-3">TB</h5>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <NumberInputWithVoice label="Total Presumptive" name="health_tb_presumptive" value={formData.health_tb_presumptive} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('health_tb_presumptive', file)} />
              <NumberInputWithVoice label="Total on Treatment" name="health_tb_on_treatment" value={formData.health_tb_on_treatment} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('health_tb_on_treatment', file)} />
            </div>
          </div>

          {/* 3B: Health Facility Support */}
          <div>
            <h4 className="text-sm sm:text-md font-semibold text-neutral-800 mb-4 pb-2 border-b border-neutral-200">
              3B. Health Facility Support
            </h4>
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-neutral-600">Facilities renovated (last month):</p>
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <NumberInputWithVoice label="By Govt" name="facilities_renovated_govt" value={formData.facilities_renovated_govt} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('facilities_renovated_govt', file)} />
                <NumberInputWithVoice label="By Partners" name="facilities_renovated_partners" value={formData.facilities_renovated_partners} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('facilities_renovated_partners', file)} />
                <NumberInputWithVoice label="By WDC" name="facilities_renovated_wdc" value={formData.facilities_renovated_wdc} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('facilities_renovated_wdc', file)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <NumberInputWithVoice label="Items donated by WDC" name="items_donated_count" value={formData.items_donated_count} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('items_donated_count', file)} />
                  <div className="mt-2">
                    <label className="block text-xs text-neutral-600 mb-1">Type of items:</label>
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {DONATION_ITEMS.slice(0, 6).map(item => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handleMultiSelect('items_donated_types', item)}
                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${formData.items_donated_types.includes(item)
                            ? 'bg-primary-100 border-primary-500 text-primary-700'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-600'
                            }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <NumberInputWithVoice label="Items repaired" name="items_repaired_count" value={formData.items_repaired_count} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('items_repaired_count', file)} />
                </div>
              </div>
            </div>
          </div>

          {/* 3C: Transportation */}
          <div>
            <h4 className="text-sm sm:text-md font-semibold text-neutral-800 mb-4 pb-2 border-b border-neutral-200">
              3C. Transportation & Emergency
            </h4>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <NumberInputWithVoice label="Women to ANC" name="women_transported_anc" value={formData.women_transported_anc} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('women_transported_anc', file)} />
              <NumberInputWithVoice label="Women to Delivery" name="women_transported_delivery" value={formData.women_transported_delivery} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('women_transported_delivery', file)} />
              <NumberInputWithVoice label="Children U5 (danger)" name="children_transported_danger" value={formData.children_transported_danger} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('children_transported_danger', file)} />
              <NumberInputWithVoice label="Delivery items support" name="women_supported_delivery_items" value={formData.women_supported_delivery_items} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('women_supported_delivery_items', file)} />
            </div>
          </div>

          {/* 3D: cMPDSR */}
          <div>
            <h4 className="text-sm sm:text-md font-semibold text-neutral-800 mb-4 pb-2 border-b border-neutral-200">
              3D. cMPDSR (Community Maternal and Perinatal Death Surveillance and Response)
            </h4>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-4">
              <div>
                <NumberInputWithVoice label="Number of Maternal Deaths (last month)" name="maternal_deaths" value={formData.maternal_deaths} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('maternal_deaths', file)} />
              </div>
              <div>
                <NumberInputWithVoice label="Number of Perinatal Deaths (last month)" name="perinatal_deaths" value={formData.perinatal_deaths} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('perinatal_deaths', file)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h5 className="text-xs sm:text-sm font-semibold text-neutral-700 mb-3">Causes of maternal deaths identified by community:</h5>
                <div className="space-y-2">
                  <InputWithVoice
                    label="Cause 1"
                    name="maternal_death_cause_1"
                    value={formData.maternal_death_causes[0] || ''}
                    onChange={(e) => {
                      const newCauses = [...formData.maternal_death_causes];
                      newCauses[0] = e.target.value;
                      setFormData(prev => ({ ...prev, maternal_death_causes: newCauses }));
                    }}
                    onVoiceNote={(file) => handleVoiceNote('maternal_death_cause_1', file)}
                    placeholder="Enter cause..."
                  />
                  <InputWithVoice
                    label="Cause 2"
                    name="maternal_death_cause_2"
                    value={formData.maternal_death_causes[1] || ''}
                    onChange={(e) => {
                      const newCauses = [...formData.maternal_death_causes];
                      newCauses[1] = e.target.value;
                      setFormData(prev => ({ ...prev, maternal_death_causes: newCauses }));
                    }}
                    onVoiceNote={(file) => handleVoiceNote('maternal_death_cause_2', file)}
                    placeholder="Enter cause..."
                  />
                  <InputWithVoice
                    label="Cause 3"
                    name="maternal_death_cause_3"
                    value={formData.maternal_death_causes[2] || ''}
                    onChange={(e) => {
                      const newCauses = [...formData.maternal_death_causes];
                      newCauses[2] = e.target.value;
                      setFormData(prev => ({ ...prev, maternal_death_causes: newCauses }));
                    }}
                    onVoiceNote={(file) => handleVoiceNote('maternal_death_cause_3', file)}
                    placeholder="Enter cause..."
                  />
                </div>
              </div>

              <div>
                <h5 className="text-xs sm:text-sm font-semibold text-neutral-700 mb-3">Causes of perinatal deaths identified by community:</h5>
                <div className="space-y-2">
                  <InputWithVoice
                    label="Cause 1"
                    name="perinatal_death_cause_1"
                    value={formData.perinatal_death_causes[0] || ''}
                    onChange={(e) => {
                      const newCauses = [...formData.perinatal_death_causes];
                      newCauses[0] = e.target.value;
                      setFormData(prev => ({ ...prev, perinatal_death_causes: newCauses }));
                    }}
                    onVoiceNote={(file) => handleVoiceNote('perinatal_death_cause_1', file)}
                    placeholder="Enter cause..."
                  />
                  <InputWithVoice
                    label="Cause 2"
                    name="perinatal_death_cause_2"
                    value={formData.perinatal_death_causes[1] || ''}
                    onChange={(e) => {
                      const newCauses = [...formData.perinatal_death_causes];
                      newCauses[1] = e.target.value;
                      setFormData(prev => ({ ...prev, perinatal_death_causes: newCauses }));
                    }}
                    onVoiceNote={(file) => handleVoiceNote('perinatal_death_cause_2', file)}
                    placeholder="Enter cause..."
                  />
                  <InputWithVoice
                    label="Cause 3"
                    name="perinatal_death_cause_3"
                    value={formData.perinatal_death_causes[2] || ''}
                    onChange={(e) => {
                      const newCauses = [...formData.perinatal_death_causes];
                      newCauses[2] = e.target.value;
                      setFormData(prev => ({ ...prev, perinatal_death_causes: newCauses }));
                    }}
                    onVoiceNote={(file) => handleVoiceNote('perinatal_death_cause_3', file)}
                    placeholder="Enter cause..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </FormSection>

      {/* Section 4: Community Involvement & Town Hall Feedback */}
      <FormSection title="COMMUNITY INVOLVEMENT & TOWN HALL FEEDBACK" number="4" icon={MessageSquare}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-neutral-700 mb-2">
              Quarterly Town Hall Conducted?
            </label>
            <div className="flex gap-4">
              {['Yes', 'No'].map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="town_hall_conducted"
                    value={opt}
                    checked={formData.town_hall_conducted === opt}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary-600 border-neutral-300 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-700">{opt}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {formData.community_feedback.map((item, idx) => (
              <div key={idx} className="p-3 bg-neutral-50 rounded-lg">
                <p className="text-xs sm:text-sm font-medium text-neutral-700 mb-2">{item.indicator}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <label className="block text-xs font-medium text-neutral-600">Feedback / Observation</label>
                      <VoiceRecorder
                        fieldName={`feedback_${idx}_feedback`}
                        onRecordingComplete={(file) => handleVoiceNote(`feedback_${idx}_feedback`, file)}
                        compact
                      />
                    </div>
                    <textarea
                      value={item.feedback}
                      onChange={(e) => handleFeedbackChange(idx, 'feedback', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg resize-none"
                      rows={2}
                      placeholder="Feedback..."
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <label className="block text-xs font-medium text-neutral-600">Action Required</label>
                      <VoiceRecorder
                        fieldName={`feedback_${idx}_action`}
                        onRecordingComplete={(file) => handleVoiceNote(`feedback_${idx}_action`, file)}
                        compact
                      />
                    </div>
                    <textarea
                      value={item.action_required}
                      onChange={(e) => handleFeedbackChange(idx, 'action_required', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg resize-none"
                      rows={2}
                      placeholder="Action required..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </FormSection>

      {/* Section 5: Reports from Village Development Committees (VDCs) */}
      <FormSection title="REPORTS FROM VILLAGE DEVELOPMENT COMMITTEES (VDCs)" number="5" icon={MapPin}>
        <DynamicTable
          tableId="vdc_reports"
          columns={[
            { name: 'vdc_name', label: 'VDC (Settlement)', type: 'text', placeholder: 'VDC name...' },
            { name: 'issues', label: 'Issues (CHIPS agents, CVs, disease outbreaks, education, WASH, sanitation, roads, etc.)', type: 'textarea', placeholder: 'Describe issues...' },
            { name: 'action_taken', label: 'Action Taken / Action Required', type: 'textarea', placeholder: 'Actions...' },
          ]}
          rows={formData.vdc_reports}
          onRowChange={handleVDCChange}
          onAddRow={addVDCRow}
          onRemoveRow={removeVDCRow}
          onVoiceNote={handleVoiceNote}
        />
      </FormSection>

      {/* Section 6: Community Mobilization Activities */}
      <FormSection title="COMMUNITY MOBILIZATION ACTIVITIES" number="6" icon={Users}>
        <div className="space-y-4">
          <InputWithVoice
            label="Awareness Creation Theme"
            name="awareness_theme"
            value={formData.awareness_theme}
            onChange={handleChange}
            onVoiceNote={(file) => handleVoiceNote('awareness_theme', file)}
            placeholder="Enter theme..."
          />
          <InputWithVoice
            label="Traditional Leaders Support Needed"
            name="traditional_leaders_support"
            type="textarea"
            value={formData.traditional_leaders_support}
            onChange={handleChange}
            onVoiceNote={(file) => handleVoiceNote('traditional_leaders_support', file)}
            placeholder="Describe support needed..."
            rows={2}
          />
          <InputWithVoice
            label="Religious Leaders Support Needed"
            name="religious_leaders_support"
            type="textarea"
            value={formData.religious_leaders_support}
            onChange={handleChange}
            onVoiceNote={(file) => handleVoiceNote('religious_leaders_support', file)}
            placeholder="Describe support needed..."
            rows={2}
          />
        </div>
      </FormSection>

      {/* Section 7: Community Action Plan */}
      <FormSection title="COMMUNITY ACTION PLAN" number="7" icon={Calendar}>
        <DynamicTable
          tableId="action_plan"
          columns={[
            { name: 'issue', label: 'Issues Identified', type: 'textarea', placeholder: 'Issue...' },
            { name: 'action', label: 'Actions Agreed', type: 'textarea', placeholder: 'Action...' },
            { name: 'timeline', label: 'Timeline', type: 'text', placeholder: 'Timeline' },
            { name: 'responsible_person', label: 'Responsible Person', type: 'text', placeholder: 'Name' },
          ]}
          rows={formData.action_plan}
          onRowChange={handleActionPlanChange}
          onAddRow={addActionPlanRow}
          onRemoveRow={removeActionPlanRow}
          onVoiceNote={handleVoiceNote}
        />
      </FormSection>

      {/* Section 8: Support Required & Conclusion */}
      <FormSection title="SUPPORT REQUIRED & CONCLUSION" number="8" icon={AlertTriangle}>
        <div className="space-y-4">
          <InputWithVoice
            label="Support Required (LEMCHIC / Government / Partners / Others)"
            name="support_required"
            type="textarea"
            value={formData.support_required}
            onChange={handleChange}
            onVoiceNote={(file) => handleVoiceNote('support_required', file)}
            placeholder="List support required..."
            rows={3}
          />
          <InputWithVoice
            label="Any Other Business (AOB)"
            name="aob"
            type="textarea"
            value={formData.aob}
            onChange={handleChange}
            onVoiceNote={(file) => handleVoiceNote('aob', file)}
            placeholder="Other business..."
            rows={3}
          />

          <div className="bg-primary-50 p-4 rounded-lg border border-primary-200">
            <h5 className="text-xs sm:text-sm font-semibold text-primary-800 mb-3">Attendance Summary</h5>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <NumberInputWithVoice label="Total" name="attendance_total" value={formData.attendance_total} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('attendance_total', file)} />
              <NumberInputWithVoice label="Male" name="attendance_male" value={formData.attendance_male} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('attendance_male', file)} />
              <NumberInputWithVoice label="Female" name="attendance_female" value={formData.attendance_female} onChange={handleChange} onVoiceNote={(file) => handleVoiceNote('attendance_female', file)} />
            </div>
            <p className="text-xs text-primary-600 mt-2">(Attach attendance list with signatures and phone numbers with pictures)</p>
          </div>

          {/* Attendance Picture Upload */}
          <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <h5 className="text-xs sm:text-sm font-semibold text-neutral-800 mb-3 flex items-center gap-2">
              <Image className="w-4 h-4" />
              Upload Attendance Pictures
            </h5>
            <div className="space-y-3">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-300 rounded-lg cursor-pointer hover:bg-neutral-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                  <p className="text-sm text-neutral-600">Click to upload attendance pictures</p>
                  <p className="text-xs text-neutral-500">PNG, JPG up to 10MB each</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePictureUpload}
                  className="hidden"
                />
              </label>

              {attendancePictures.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {attendancePictures.map((pic, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={pic.preview}
                        alt={`Attendance ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-neutral-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePicture(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <p className="text-xs text-neutral-500 mt-1 truncate">{pic.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-neutral-700 mb-1">
              Adjournment - Date of Next Meeting
            </label>
            <input
              type="date"
              name="next_meeting_date"
              value={formData.next_meeting_date}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-200">
            <InputWithVoice
              label="WDC Chairman Signature"
              name="chairman_signature"
              value={formData.chairman_signature}
              onChange={handleChange}
              onVoiceNote={(file) => handleVoiceNote('chairman_signature', file)}
              placeholder="Chairman's name..."
            />
            <InputWithVoice
              label="WDC Secretary Signature"
              name="secretary_signature"
              value={formData.secretary_signature}
              onChange={handleChange}
              onVoiceNote={(file) => handleVoiceNote('secretary_signature', file)}
              placeholder="Secretary's name..."
            />
          </div>
        </div>
      </FormSection>

      {/* Voice Notes Summary */}
      {Object.keys(voiceNotes).filter(k => voiceNotes[k]).length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h5 className="text-xs sm:text-sm font-semibold text-blue-800 mb-2">
            Voice Notes ({Object.keys(voiceNotes).filter(k => voiceNotes[k]).length})
          </h5>
          <div className="flex flex-wrap gap-2">
            {Object.keys(voiceNotes)
              .filter(k => voiceNotes[k])
              .map(fieldName => (
                <span key={fieldName} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                  {fieldName.replace(/_/g, ' ')}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 border-t border-neutral-200 sticky bottom-0 bg-white pb-4">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={onCancel}
          className="flex-1 sm:flex-none"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          icon={Send}
          loading={submitMutation.isPending}
          className="flex-1"
        >
          Submit Report
        </Button>
      </div>
    </form>
  );
};

export default WDCReportForm;
