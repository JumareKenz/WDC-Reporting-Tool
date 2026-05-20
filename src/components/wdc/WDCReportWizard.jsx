/**
 * WDCReportWizard — KoboCollect-style Multi-Step Form for WDC Reports
 * 
 * This replaces the old scrollable form with a step-by-step wizard.
 * Each section is shown as a separate step with progress indication.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { FileText, CheckCircle, Heart, MessageSquare, MapPin, Users, Calendar, AlertTriangle } from 'lucide-react';
import FormWizard, { WizardField } from '../common/FormWizard';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../api/client';
import VoiceRecorder from './VoiceRecorder';
import { getCurrentFormVersionId } from '../../services/formConfigService';

// Form steps configuration
const FORM_STEPS = [
  {
    id: 'agenda',
    title: 'Agenda & Governance',
    description: 'Meeting details and agenda items',
    icon: FileText,
    fields: ['meeting_type', 'agenda_items']
  },
  {
    id: 'action_tracker',
    title: 'Action Tracker',
    description: 'Feedback from last meeting',
    icon: CheckCircle,
    fields: ['action_tracker']
  },
  {
    id: 'health_data',
    title: 'Health System Data',
    description: 'Health statistics and facility support',
    icon: Heart,
    fields: ['health_opd', 'health_anc', 'health_facilities']
  },
  {
    id: 'community',
    title: 'Community Feedback',
    description: 'Town hall and community input',
    icon: MessageSquare,
    fields: ['town_hall', 'community_feedback'],
    condition: (data) => data.meeting_type === 'Quarterly Town Hall'
  },
  {
    id: 'vdc',
    title: 'VDC Reports',
    description: 'Village Development Committee reports',
    icon: MapPin,
    fields: ['vdc_reports']
  },
  {
    id: 'mobilization',
    title: 'Community Mobilization',
    description: 'Mobilization activities and themes',
    icon: Users,
    fields: ['mobilization']
  },
  {
    id: 'action_plan',
    title: 'Action Plan',
    description: 'Community action plan for next month',
    icon: Calendar,
    fields: ['action_plan']
  },
  {
    id: 'conclusion',
    title: 'Support & Conclusion',
    description: 'Attendance and support required',
    icon: AlertTriangle,
    fields: ['attendance', 'support_required', 'signatures']
  }
];

const WDCReportWizard = ({ onSuccess, onCancel, userWard, userLGA, submissionInfo, injectedFields, submissionMethod = 'wizard' }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [voiceNotes, setVoiceNotes] = useState({});
  const [highlightedFields, setHighlightedFields] = useState(new Set());

  // Initial form data
  const initialData = {
    // Header
    state: 'Kaduna State',
    lga_id: userLGA?.id || '',
    ward_id: userWard?.id || '',
    report_date: new Date().toISOString().split('T')[0],
    report_time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    report_month: submissionInfo?.target_month || '',
    
    // Section 1: Agenda
    meeting_type: 'Monthly',
    agenda_opening_prayer: true,
    agenda_minutes: true,
    agenda_action_tracker: true,
    agenda_reports: true,
    agenda_action_plan: true,
    agenda_aob: true,
    agenda_closing: true,
    
    // Section 2: Action Tracker
    action_tracker: [{ action_point: '', status: '', challenges: '', timeline: '', responsible_person: '' }],
    
    // Section 3A: General Attendance — OPD Immunization
    health_opd_total: '',
    health_penta1: '',
    health_bcg: '',
    health_penta3: '',
    health_measles: '',
    // Section 3A: OPD Under 5
    health_opd_under5_total: '',
    health_malaria_under5: '',
    health_diarrhea_under5: '',
    // Section 3A: ANC
    health_anc_total: '',
    health_anc_first_visit: '',
    health_anc_fourth_visit: '',
    health_anc_eighth_visit: '',
    // Section 3A: Deliveries
    health_deliveries: '',
    health_postnatal: '',
    // Section 3A: Family Planning
    health_fp_counselling: '',
    health_fp_new_acceptors: '',
    // Section 3A: Hep B
    health_hepb_tested: '',
    health_hepb_positive: '',
    // Section 3A: TB
    health_tb_presumptive: '',
    health_tb_on_treatment: '',
    // Section 3B: Facility Support
    facilities_renovated_govt: '',
    facilities_renovated_partners: '',
    facilities_renovated_wdc: '',
    items_donated_count: '',
    items_donated_govt_count: '',
    items_repaired_count: '',
    // Section 3C: Transportation
    women_transported_anc: '',
    women_transported_delivery: '',
    children_transported_danger: '',
    women_supported_delivery_items: '',
    // Section 3D: cMPDSR
    maternal_deaths: '',
    perinatal_deaths: '',
    
    // Section 4: Community Feedback
    town_hall_conducted: '',
    community_feedback: [
      { indicator: "Health Workers' Attitude", feedback: '', action_required: '' },
      { indicator: 'Waiting Time', feedback: '', action_required: '' },
      { indicator: 'Service Charges / Fees', feedback: '', action_required: '' },
      { indicator: 'Client Satisfaction', feedback: '', action_required: '' },
      { indicator: 'Others', feedback: '', action_required: '' },
    ],
    
    // Section 5: VDC Reports
    vdc_reports: [{ vdc_name: '', issues: '', action_taken: '' }],
    
    // Section 6: Mobilization
    awareness_theme: '',
    traditional_leaders_support: '',
    religious_leaders_support: '',
    
    // Section 7: Action Plan
    action_plan: [{ issue: '', action: '', timeline: '', responsible_person: '' }],
    
    // Section 8: Conclusion
    attendance_total: '',
    attendance_male: '',
    attendance_female: '',
    support_required: '',
    aob: '',
    next_meeting_date: '',
  };

  // Apply injected fields from OCR or Voice Assistant
  const [mergedInitialData, setMergedInitialData] = useState(initialData);

  useEffect(() => {
    if (injectedFields && typeof injectedFields === 'object') {
      const fieldNames = new Set();
      const merged = { ...mergedInitialData };
      let appliedCount = 0;

      Object.entries(injectedFields).forEach(([key, value]) => {
        if (key in merged && value !== undefined && value !== null && value !== '') {
          merged[key] = value;
          fieldNames.add(key);
          appliedCount++;
        }
      });

      if (appliedCount > 0) {
        setMergedInitialData(merged);
        setHighlightedFields(fieldNames);
        toast.success(
          `${appliedCount} field${appliedCount > 1 ? 's' : ''} auto-filled. Please review before submitting.`,
          { title: 'Data Extracted', duration: 5000 }
        );
      }
    }
  }, [injectedFields]);

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (formData) => {
      const formVersionId = getCurrentFormVersionId();
      if (!formVersionId) {
        throw new Error('Form configuration not loaded. Please reconnect and try again.');
      }

      const payload = new FormData();
      payload.append('formVersionId', formVersionId);
      payload.append('submissionMethod', submissionMethod);
      if (userWard?.id) payload.append('wardId', String(userWard.id));
      payload.append('report_month', formData.report_month);
      payload.append('report_data', JSON.stringify(formData));

      // Add voice notes
      Object.entries(voiceNotes).forEach(([fieldName, file]) => {
        if (file) {
          payload.append(`voice_${fieldName}`, file);
        }
      });

      const response = await apiClient.post('/reports', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response;
    },
    onSuccess: () => {
      toast.success('Report submitted successfully!');
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit report');
    },
  });

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async (formData) => {
      const formVersionId = getCurrentFormVersionId();
      const payload = new FormData();
      if (formVersionId) payload.append('formVersionId', formVersionId);
      payload.append('submissionMethod', submissionMethod);
      if (userWard?.id) payload.append('wardId', String(userWard.id));
      payload.append('report_month', formData.report_month);
      payload.append('report_data', JSON.stringify(formData));

      const response = await apiClient.post('/reports/draft', payload);
      return response;
    },
  });

  // Handle form submission
  const handleSubmit = async (formData) => {
    await submitMutation.mutateAsync(formData);
  };

  // Handle draft save
  const handleSaveDraft = async (formData) => {
    try {
      await saveDraftMutation.mutateAsync(formData);
    } catch (error) {
      console.error('Draft save failed:', error);
    }
  };

  // Validate each step
  const validateStep = (stepIndex, formData) => {
    const step = FORM_STEPS[stepIndex];
    const errors = [];

    switch (step.id) {
      case 'agenda':
        if (!formData.meeting_type) {
          errors.push({ field: 'meeting_type', message: 'Meeting type is required' });
        }
        break;
        
      case 'conclusion':
        const total = parseInt(formData.attendance_total) || 0;
        const male = parseInt(formData.attendance_male) || 0;
        const female = parseInt(formData.attendance_female) || 0;
        
        if (total < (male + female)) {
          errors.push({
            field: 'attendance_total',
            message: `Total (${total}) must be >= Male (${male}) + Female (${female})`
          });
        }
        break;
    }

    return errors;
  };

  // Validate all before final submit
  const validateAll = (formData) => {
    const errors = [];
    
    // Check required fields across all steps
    if (!formData.meeting_type) {
      errors.push({ step: 0, field: 'meeting_type', message: 'Meeting type is required' });
    }
    
    const total = parseInt(formData.attendance_total) || 0;
    const male = parseInt(formData.attendance_male) || 0;
    const female = parseInt(formData.attendance_female) || 0;
    
    if (total < (male + female)) {
      errors.push({
        step: 7,
        field: 'attendance_total',
        message: `Attendance total must be at least Male + Female`
      });
    }
    
    return errors;
  };

  // Helper: returns extra className for auto-filled fields
  const getHighlightClass = (fieldName) =>
    highlightedFields.has(fieldName) ? 'ring-2 ring-yellow-400 bg-yellow-50' : '';

  // Render each step's content
  const renderStepContent = (stepId, { formData, updateFormData }) => {
    const stepProps = { formData, updateFormData, highlightedFields, getHighlightClass };
    switch (stepId) {
      case 'agenda':
        return <AgendaStep {...stepProps} />;
      case 'action_tracker':
        return <ActionTrackerStep {...stepProps} />;
      case 'health_data':
        return <HealthDataStep {...stepProps} />;
      case 'community':
        return <CommunityStep {...stepProps} />;
      case 'vdc':
        return <VDCStep {...stepProps} />;
      case 'mobilization':
        return <MobilizationStep {...stepProps} voiceNotes={voiceNotes} setVoiceNotes={setVoiceNotes} />;
      case 'action_plan':
        return <ActionPlanStep {...stepProps} />;
      case 'conclusion':
        return <ConclusionStep {...stepProps} voiceNotes={voiceNotes} setVoiceNotes={setVoiceNotes} />;
      default:
        return null;
    }
  };

  // Build steps for FormWizard
  const steps = FORM_STEPS.map(step => ({
    ...step,
    component: ({ formData, updateFormData }) => renderStepContent(step.id, { formData, updateFormData })
  }));

  return (
    <div className="wdc-report-wizard">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4 rounded-xl mb-6">
        <h2 className="text-lg font-bold">KADUNA STATE WDC MONTHLY REPORT</h2>
        <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
          <div>
            <span className="text-primary-200">LGA:</span>{' '}
            <span className="font-semibold">{userLGA?.name || 'Not assigned'}</span>
          </div>
          <div>
            <span className="text-primary-200">Ward:</span>{' '}
            <span className="font-semibold">{userWard?.name || 'Not assigned'}</span>
          </div>
          <div>
            <span className="text-primary-200">Month:</span>{' '}
            <span className="font-semibold">{submissionInfo?.month_name}</span>
          </div>
        </div>
      </div>

      {/* Form Wizard */}
      <FormWizard
        steps={steps}
        initialData={mergedInitialData}
        onSubmit={handleSubmit}
        onSaveDraft={handleSaveDraft}
        validateStep={validateStep}
        validateAll={validateAll}
        autoSaveInterval={30000}
      />
    </div>
  );
};

// Step Components

const AgendaStep = ({ formData, updateFormData }) => (
  <div className="space-y-4">
    <WizardField label="Meeting Type" required>
      <div className="flex flex-wrap gap-3">
        {['Monthly', 'Emergency', 'Quarterly Town Hall'].map(type => (
          <label key={type} className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="meeting_type"
              value={type}
              checked={formData.meeting_type === type}
              onChange={(e) => updateFormData('meeting_type', e.target.value)}
              className="w-4 h-4 text-primary-600"
            />
            <span className="text-sm">{type}</span>
          </label>
        ))}
      </div>
    </WizardField>

    <WizardField label="Agenda Items Covered">
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: 'agenda_opening_prayer', label: 'Opening Prayer' },
          { key: 'agenda_minutes', label: 'Minutes of Last Meeting' },
          { key: 'agenda_action_tracker', label: 'Action Tracker' },
          { key: 'agenda_reports', label: 'Reports' },
          { key: 'agenda_action_plan', label: 'Action Plan' },
          { key: 'agenda_aob', label: 'Any Other Business' },
          { key: 'agenda_closing', label: 'Closing' },
        ].map(item => (
          <label key={item.key} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
            <input
              type="checkbox"
              checked={formData[item.key]}
              onChange={(e) => updateFormData(item.key, e.target.checked)}
              className="w-4 h-4 text-primary-600"
            />
            <span className="text-sm">{item.label}</span>
          </label>
        ))}
      </div>
    </WizardField>
  </div>
);

const ActionTrackerStep = ({ formData, updateFormData }) => (
  <div className="space-y-4">
    <p className="text-sm text-gray-600">Track actions from the previous meeting</p>
    
    {formData.action_tracker?.map((row, index) => (
      <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-medium text-sm">Action {index + 1}</span>
          {index > 0 && (
            <button
              onClick={() => {
                const newTracker = formData.action_tracker.filter((_, i) => i !== index);
                updateFormData('action_tracker', newTracker);
              }}
              className="text-red-500 text-sm"
            >
              Remove
            </button>
          )}
        </div>
        
        <input
          type="text"
          placeholder="Action point"
          value={row.action_point}
          onChange={(e) => {
            const newTracker = [...formData.action_tracker];
            newTracker[index].action_point = e.target.value;
            updateFormData('action_tracker', newTracker);
          }}
          className="w-full p-2 border rounded"
        />
        
        <select
          value={row.status}
          onChange={(e) => {
            const newTracker = [...formData.action_tracker];
            newTracker[index].status = e.target.value;
            updateFormData('action_tracker', newTracker);
          }}
          className="w-full p-2 border rounded"
        >
          <option value="">Select status...</option>
          <option value="Completed">Completed</option>
          <option value="On-going">On-going</option>
          <option value="Not Started">Not Started</option>
        </select>
      </div>
    ))}
    
    <button
      onClick={() => updateFormData('action_tracker', [...formData.action_tracker, { action_point: '', status: '', challenges: '', timeline: '', responsible_person: '' }])}
      className="text-primary-600 text-sm font-medium"
    >
      + Add Action
    </button>
  </div>
);

const NumInput = ({ name, label, formData, updateFormData, getHighlightClass }) => (
  <WizardField label={label}>
    <input
      type="number"
      min={0}
      value={formData[name] ?? ''}
      onChange={(e) => updateFormData(name, e.target.value)}
      className={`w-full p-2 text-sm border rounded-lg ${getHighlightClass(name)}`}
      placeholder="0"
    />
  </WizardField>
);

const HealthDataStep = ({ formData, updateFormData, getHighlightClass = () => '' }) => {
  const numProps = { formData, updateFormData, getHighlightClass };
  return (
    <div className="space-y-5">
      {/* OPD Immunization */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-600 mb-2 uppercase tracking-wide">OPD Immunization</h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <NumInput name="health_opd_total" label="OPD Total" {...numProps} />
          <NumInput name="health_penta1" label="Penta 1" {...numProps} />
          <NumInput name="health_bcg" label="BCG" {...numProps} />
          <NumInput name="health_penta3" label="Penta 3" {...numProps} />
          <NumInput name="health_measles" label="Measles" {...numProps} />
        </div>
      </div>

      {/* OPD Under 5 */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-600 mb-2 uppercase tracking-wide">OPD Under 5</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <NumInput name="health_opd_under5_total" label="Under 5 Total" {...numProps} />
          <NumInput name="health_malaria_under5" label="Malaria Under 5" {...numProps} />
          <NumInput name="health_diarrhea_under5" label="Diarrhea Under 5" {...numProps} />
        </div>
      </div>

      {/* ANC */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-600 mb-2 uppercase tracking-wide">ANC</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <NumInput name="health_anc_total" label="ANC Total" {...numProps} />
          <NumInput name="health_anc_first_visit" label="1st Visit" {...numProps} />
          <NumInput name="health_anc_fourth_visit" label="4th Visit" {...numProps} />
          <NumInput name="health_anc_eighth_visit" label="8th Visit" {...numProps} />
        </div>
      </div>

      {/* Deliveries & PNC */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-600 mb-2 uppercase tracking-wide">Deliveries & Post-Natal</h4>
        <div className="grid grid-cols-2 gap-3">
          <NumInput name="health_deliveries" label="Deliveries" {...numProps} />
          <NumInput name="health_postnatal" label="Post-Natal" {...numProps} />
        </div>
      </div>

      {/* Family Planning */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-600 mb-2 uppercase tracking-wide">Family Planning</h4>
        <div className="grid grid-cols-2 gap-3">
          <NumInput name="health_fp_counselling" label="Counselling" {...numProps} />
          <NumInput name="health_fp_new_acceptors" label="New Acceptors" {...numProps} />
        </div>
      </div>

      {/* Hepatitis B */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-600 mb-2 uppercase tracking-wide">Hepatitis B</h4>
        <div className="grid grid-cols-2 gap-3">
          <NumInput name="health_hepb_tested" label="Tested" {...numProps} />
          <NumInput name="health_hepb_positive" label="Positive" {...numProps} />
        </div>
      </div>

      {/* TB */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-600 mb-2 uppercase tracking-wide">TB</h4>
        <div className="grid grid-cols-2 gap-3">
          <NumInput name="health_tb_presumptive" label="Presumptive" {...numProps} />
          <NumInput name="health_tb_on_treatment" label="On Treatment" {...numProps} />
        </div>
      </div>

      {/* Facility Support */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-600 mb-2 uppercase tracking-wide">Facility Support — Renovations</h4>
        <div className="grid grid-cols-3 gap-3">
          <NumInput name="facilities_renovated_govt" label="By Govt" {...numProps} />
          <NumInput name="facilities_renovated_partners" label="By Partners" {...numProps} />
          <NumInput name="facilities_renovated_wdc" label="By WDC" {...numProps} />
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-neutral-600 mb-2 uppercase tracking-wide">Facility Support — Items</h4>
        <div className="grid grid-cols-3 gap-3">
          <NumInput name="items_donated_count" label="Donated (WDC)" {...numProps} />
          <NumInput name="items_donated_govt_count" label="Donated (Govt)" {...numProps} />
          <NumInput name="items_repaired_count" label="Repaired" {...numProps} />
        </div>
      </div>

      {/* Transportation */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-600 mb-2 uppercase tracking-wide">Transportation & Emergency</h4>
        <div className="grid grid-cols-2 gap-3">
          <NumInput name="women_transported_anc" label="Women → ANC" {...numProps} />
          <NumInput name="women_transported_delivery" label="Women → Delivery" {...numProps} />
          <NumInput name="children_transported_danger" label="Children (Danger)" {...numProps} />
          <NumInput name="women_supported_delivery_items" label="Delivery Items Support" {...numProps} />
        </div>
      </div>

      {/* cMPDSR */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-600 mb-2 uppercase tracking-wide">cMPDSR — Deaths</h4>
        <div className="grid grid-cols-2 gap-3">
          <NumInput name="maternal_deaths" label="Maternal Deaths" {...numProps} />
          <NumInput name="perinatal_deaths" label="Perinatal Deaths" {...numProps} />
        </div>
      </div>
    </div>
  );
};

const CommunityStep = ({ formData, updateFormData }) => (
  <div className="space-y-4">
    <WizardField label="Town Hall Conducted?">
      <div className="flex gap-4">
        {['Yes', 'No'].map(opt => (
          <label key={opt} className="flex items-center gap-2">
            <input
              type="radio"
              name="town_hall_conducted"
              value={opt}
              checked={formData.town_hall_conducted === opt}
              onChange={(e) => updateFormData('town_hall_conducted', e.target.value)}
              className="w-4 h-4 text-primary-600"
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    </WizardField>
    
    <div className="space-y-3">
      <p className="font-medium text-sm">Community Feedback</p>
      {formData.community_feedback?.map((item, idx) => (
        <div key={idx} className="p-3 bg-gray-50 rounded">
          <p className="text-sm font-medium text-gray-700">{item.indicator}</p>
          <input
            type="text"
            placeholder="Feedback/Observation"
            value={item.feedback}
            onChange={(e) => {
              const newFeedback = [...formData.community_feedback];
              newFeedback[idx].feedback = e.target.value;
              updateFormData('community_feedback', newFeedback);
            }}
            className="w-full mt-2 p-2 border rounded text-sm"
          />
        </div>
      ))}
    </div>
  </div>
);

const VDCStep = ({ formData, updateFormData }) => (
  <div className="space-y-4">
    <p className="text-sm text-gray-600">Reports from Village Development Committees</p>
    
    {formData.vdc_reports?.map((row, index) => (
      <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-medium text-sm">VDC Report {index + 1}</span>
          {index > 0 && (
            <button
              onClick={() => {
                const newReports = formData.vdc_reports.filter((_, i) => i !== index);
                updateFormData('vdc_reports', newReports);
              }}
              className="text-red-500 text-sm"
            >
              Remove
            </button>
          )}
        </div>
        
        <input
          type="text"
          placeholder="VDC/Settlement name"
          value={row.vdc_name}
          onChange={(e) => {
            const newReports = [...formData.vdc_reports];
            newReports[index].vdc_name = e.target.value;
            updateFormData('vdc_reports', newReports);
          }}
          className="w-full p-2 border rounded"
        />
        
        <textarea
          placeholder="Issues (CHIPS, CVs, outbreaks, etc.)"
          value={row.issues}
          onChange={(e) => {
            const newReports = [...formData.vdc_reports];
            newReports[index].issues = e.target.value;
            updateFormData('vdc_reports', newReports);
          }}
          className="w-full p-2 border rounded"
          rows={2}
        />
      </div>
    ))}
    
    <button
      onClick={() => updateFormData('vdc_reports', [...formData.vdc_reports, { vdc_name: '', issues: '', action_taken: '' }])}
      className="text-primary-600 text-sm font-medium"
    >
      + Add VDC Report
    </button>
  </div>
);

const MobilizationStep = ({ formData, updateFormData, voiceNotes, setVoiceNotes }) => (
  <div className="space-y-4">
    <WizardField label="Awareness Creation Theme" helpText="Record a voice note or type">
      <div className="flex gap-2">
        <input
          type="text"
          value={formData.awareness_theme}
          onChange={(e) => updateFormData('awareness_theme', e.target.value)}
          className="flex-1 p-3 border rounded-lg"
          placeholder="Enter theme..."
        />
        <VoiceRecorder
          fieldName="awareness_theme"
          onRecordingComplete={(file) => setVoiceNotes(prev => ({ ...prev, awareness_theme: file }))}
          compact
        />
      </div>
    </WizardField>
    
    <WizardField label="Traditional Leaders Support Needed">
      <div className="flex gap-2">
        <textarea
          value={formData.traditional_leaders_support}
          onChange={(e) => updateFormData('traditional_leaders_support', e.target.value)}
          className="flex-1 p-3 border rounded-lg"
          rows={2}
          placeholder="Describe support needed..."
        />
        <VoiceRecorder
          fieldName="traditional_leaders_support"
          onRecordingComplete={(file) => setVoiceNotes(prev => ({ ...prev, traditional_leaders_support: file }))}
          compact
        />
      </div>
    </WizardField>
    
    <WizardField label="Religious Leaders Support Needed">
      <div className="flex gap-2">
        <textarea
          value={formData.religious_leaders_support}
          onChange={(e) => updateFormData('religious_leaders_support', e.target.value)}
          className="flex-1 p-3 border rounded-lg"
          rows={2}
          placeholder="Describe support needed..."
        />
        <VoiceRecorder
          fieldName="religious_leaders_support"
          onRecordingComplete={(file) => setVoiceNotes(prev => ({ ...prev, religious_leaders_support: file }))}
          compact
        />
      </div>
    </WizardField>
  </div>
);

const ActionPlanStep = ({ formData, updateFormData }) => (
  <div className="space-y-4">
    <p className="text-sm text-gray-600">Community Action Plan for next month</p>
    
    {formData.action_plan?.map((row, index) => (
      <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-medium text-sm">Action {index + 1}</span>
          {index > 0 && (
            <button
              onClick={() => {
                const newPlan = formData.action_plan.filter((_, i) => i !== index);
                updateFormData('action_plan', newPlan);
              }}
              className="text-red-500 text-sm"
            >
              Remove
            </button>
          )}
        </div>
        
        <input
          type="text"
          placeholder="Issue identified"
          value={row.issue}
          onChange={(e) => {
            const newPlan = [...formData.action_plan];
            newPlan[index].issue = e.target.value;
            updateFormData('action_plan', newPlan);
          }}
          className="w-full p-2 border rounded"
        />
        
        <input
          type="text"
          placeholder="Action agreed"
          value={row.action}
          onChange={(e) => {
            const newPlan = [...formData.action_plan];
            newPlan[index].action = e.target.value;
            updateFormData('action_plan', newPlan);
          }}
          className="w-full p-2 border rounded"
        />
        
        <input
          type="text"
          placeholder="Timeline"
          value={row.timeline}
          onChange={(e) => {
            const newPlan = [...formData.action_plan];
            newPlan[index].timeline = e.target.value;
            updateFormData('action_plan', newPlan);
          }}
          className="w-full p-2 border rounded"
        />
      </div>
    ))}
    
    <button
      onClick={() => updateFormData('action_plan', [...formData.action_plan, { issue: '', action: '', timeline: '', responsible_person: '' }])}
      className="text-primary-600 text-sm font-medium"
    >
      + Add Action
    </button>
  </div>
);

const ConclusionStep = ({ formData, updateFormData, voiceNotes, setVoiceNotes, getHighlightClass = () => '' }) => (
  <div className="space-y-4">
    <div className="bg-primary-50 p-4 rounded-lg">
      <p className="font-medium text-sm text-primary-800 mb-3">Attendance Summary</p>
      <div className="grid grid-cols-3 gap-3">
        <WizardField label="Total">
          <input
            type="number"
            value={formData.attendance_total}
            onChange={(e) => updateFormData('attendance_total', e.target.value)}
            className={`w-full p-2 border rounded ${getHighlightClass('attendance_total')}`}
            placeholder="0"
          />
        </WizardField>
        <WizardField label="Male">
          <input
            type="number"
            value={formData.attendance_male}
            onChange={(e) => updateFormData('attendance_male', e.target.value)}
            className={`w-full p-2 border rounded ${getHighlightClass('attendance_male')}`}
            placeholder="0"
          />
        </WizardField>
        <WizardField label="Female">
          <input
            type="number"
            value={formData.attendance_female}
            onChange={(e) => updateFormData('attendance_female', e.target.value)}
            className={`w-full p-2 border rounded ${getHighlightClass('attendance_female')}`}
            placeholder="0"
          />
        </WizardField>
      </div>
      
      {(() => {
        const total = parseInt(formData.attendance_total) || 0;
        const male = parseInt(formData.attendance_male) || 0;
        const female = parseInt(formData.attendance_female) || 0;
        if (total > 0 && total < (male + female)) {
          return (
            <p className="text-red-600 text-xs mt-2">
              Total must be at least Male + Female ({male + female})
            </p>
          );
        }
        return null;
      })()}
    </div>
    
    <WizardField label="Support Required (LEMCHIC/Govt/Partners)">
      <div className="flex gap-2">
        <textarea
          value={formData.support_required}
          onChange={(e) => updateFormData('support_required', e.target.value)}
          className="flex-1 p-3 border rounded-lg"
          rows={3}
          placeholder="List support required..."
        />
        <VoiceRecorder
          fieldName="support_required"
          onRecordingComplete={(file) => setVoiceNotes(prev => ({ ...prev, support_required: file }))}
          compact
        />
      </div>
    </WizardField>
    
    <WizardField label="Any Other Business (AOB)">
      <div className="flex gap-2">
        <textarea
          value={formData.aob}
          onChange={(e) => updateFormData('aob', e.target.value)}
          className="flex-1 p-3 border rounded-lg"
          rows={3}
          placeholder="Other business..."
        />
        <VoiceRecorder
          fieldName="aob"
          onRecordingComplete={(file) => setVoiceNotes(prev => ({ ...prev, aob: file }))}
          compact
        />
      </div>
    </WizardField>
    
    <WizardField label="Next Meeting Date">
      <input
        type="date"
        value={formData.next_meeting_date}
        onChange={(e) => updateFormData('next_meeting_date', e.target.value)}
        className="w-full p-3 border rounded-lg"
      />
    </WizardField>
  </div>
);

export default WDCReportWizard;
