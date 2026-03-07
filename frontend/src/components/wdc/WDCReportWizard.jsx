import React, { useMemo } from 'react';
import {
  FileText,
  CheckCircle,
  Heart,
  Building,
  Truck,
  Skull,
  MessageSquare,
  MapPin,
  Users,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import FormWizard from './FormWizard';

// Section components
import MeetingDetailsSection from './wizard-sections/MeetingDetailsSection';
import ActionTrackerSection from './wizard-sections/ActionTrackerSection';
import HealthDataSection from './wizard-sections/HealthDataSection';
import FacilitySupportSection from './wizard-sections/FacilitySupportSection';
import TransportEmergencySection from './wizard-sections/TransportEmergencySection';
import CMPDSRSection from './wizard-sections/CMPDSRSection';
import CommunityFeedbackSection from './wizard-sections/CommunityFeedbackSection';
import VDCReportsSection from './wizard-sections/VDCReportsSection';
import MobilizationSection from './wizard-sections/MobilizationSection';
import ActionPlanSection from './wizard-sections/ActionPlanSection';
import ConclusionSection from './wizard-sections/ConclusionSection';

/**
 * WDCReportWizard — KoboCollect-style multi-step wizard wrapping all sections
 * of the WDC Monthly Report Form.
 *
 * Props:
 *   formData      - the shared form state object
 *   onChange       - (updater) => void  — functional updater to merge data
 *   onSubmit       - () => void
 *   onSaveDraft    - () => void
 *   draftStatus    - 'idle' | 'saving' | 'saved' | 'error'
 *   onVoiceNote    - (fieldName, file) => void  — optional voice note handler
 *   userLGA        - user's LGA object (for display)
 *   userWard       - user's Ward object (for display)
 */
const NUMERIC_FIELDS = {
  health_data: [
    'health_general_attendance_total', 'health_routine_immunization_total',
    'health_penta1', 'health_bcg', 'health_penta3', 'health_measles',
    'health_malaria_under5', 'health_diarrhea_under5',
    'health_anc_total', 'health_anc_first_visit', 'health_anc_fourth_visit', 'health_anc_eighth_visit',
    'health_deliveries', 'health_postnatal',
    'health_fp_counselling', 'health_fp_new_acceptors',
    'health_hepb_tested', 'health_hepb_positive',
    'health_tb_presumptive', 'health_tb_on_treatment',
  ],
  transport: [
    'women_transported_anc', 'women_transported_delivery',
    'children_transported_danger', 'women_supported_delivery_items',
  ],
  cmpdsr: [
    'maternal_deaths', 'perinatal_deaths',
  ],
  conclusion: [
    'attendance_male', 'attendance_female',
  ],
};

function validateNoNegatives(sectionId) {
  const fields = NUMERIC_FIELDS[sectionId];
  if (!fields) return () => ({});
  return (data) => {
    const errors = {};
    for (const field of fields) {
      const val = Number(data[field]);
      if (data[field] !== '' && data[field] != null && val < 0) {
        errors[field] = 'Value cannot be negative';
      }
    }
    return errors;
  };
}

const WDCReportWizard = ({
  formData,
  onChange,
  onSubmit,
  onSaveDraft,
  draftStatus = 'idle',
  onVoiceNote,
  voiceNotes = {},
  userLGA,
  userWard,
  draftContext = null, // { userId, wardId, reportMonth }
  onImageAdd, // (fieldName, file) => void
  onImagesRemove, // (fieldName) => void
  submitDisabled = false,
  submitDisabledMessage = '',
}) => {
  // Inject user context into formData for the meeting section to display
  const enrichedFormData = useMemo(
    () => ({
      ...formData,
      _userLGA: userLGA,
      _userWard: userWard,
    }),
    [formData, userLGA, userWard]
  );

  // STABLE COMPONENT WRAPPERS - Memoized to prevent re-mounting during typing
  // These wrappers ensure component references remain stable across re-renders
  // preventing focus loss when draft auto-save or other state updates occur
  
  const MeetingDetailsWrapper = useMemo(
    () => function MeetingDetailsWrapper(props) {
      return <MeetingDetailsSection {...props} userLGA={userLGA} userWard={userWard} />;
    },
    [userLGA, userWard]
  );

  const ActionTrackerWrapper = useMemo(
    () => function ActionTrackerWrapper(props) {
      return <ActionTrackerSection {...props} onVoiceNote={onVoiceNote} voiceNotes={voiceNotes} draftContext={draftContext} />;
    },
    [onVoiceNote, voiceNotes, draftContext]
  );

  const FacilitySupportWrapper = useMemo(
    () => function FacilitySupportWrapper(props) {
      return <FacilitySupportSection {...props} onVoiceNote={onVoiceNote} voiceNotes={voiceNotes} draftContext={draftContext} />;
    },
    [onVoiceNote, voiceNotes, draftContext]
  );

  const CMPDSRWrapper = useMemo(
    () => function CMPDSRWrapper(props) {
      return <CMPDSRSection {...props} onVoiceNote={onVoiceNote} voiceNotes={voiceNotes} draftContext={draftContext} />;
    },
    [onVoiceNote, voiceNotes, draftContext]
  );

  const CommunityFeedbackWrapper = useMemo(
    () => function CommunityFeedbackWrapper(props) {
      return <CommunityFeedbackSection {...props} onVoiceNote={onVoiceNote} voiceNotes={voiceNotes} draftContext={draftContext} />;
    },
    [onVoiceNote, voiceNotes, draftContext]
  );

  const VDCReportsWrapper = useMemo(
    () => function VDCReportsWrapper(props) {
      return <VDCReportsSection {...props} onVoiceNote={onVoiceNote} voiceNotes={voiceNotes} draftContext={draftContext} />;
    },
    [onVoiceNote, voiceNotes, draftContext]
  );

  const MobilizationWrapper = useMemo(
    () => function MobilizationWrapper(props) {
      return <MobilizationSection {...props} onVoiceNote={onVoiceNote} voiceNotes={voiceNotes} draftContext={draftContext} />;
    },
    [onVoiceNote, voiceNotes, draftContext]
  );

  const ActionPlanWrapper = useMemo(
    () => function ActionPlanWrapper(props) {
      return <ActionPlanSection {...props} onVoiceNote={onVoiceNote} voiceNotes={voiceNotes} draftContext={draftContext} />;
    },
    [onVoiceNote, voiceNotes, draftContext]
  );

  const ConclusionWrapper = useMemo(
    () => function ConclusionWrapper(props) {
      return <ConclusionSection {...props} onVoiceNote={onVoiceNote} voiceNotes={voiceNotes} draftContext={draftContext} onImageAdd={onImageAdd} onImagesRemove={onImagesRemove} />;
    },
    [onVoiceNote, voiceNotes, draftContext, onImageAdd, onImagesRemove]
  );

  const sections = useMemo(
    () => {
      const baseSections = [
        {
          id: 'meeting',
          title: 'Meeting Details',
          description: 'Report date, meeting type, and agenda items covered',
          icon: FileText,
          component: MeetingDetailsWrapper,
          validate: (data) => {
            const errors = {};
            if (!data.report_date) errors.report_date = 'Report date is required';
            if (!data.meeting_type) errors.meeting_type = 'Meeting type is required';
            return errors;
          },
        },
        {
          id: 'action_tracker',
          title: 'Action Tracker',
          description: 'Feedback from the last meeting — track action points',
          icon: CheckCircle,
          component: ActionTrackerWrapper,
          validate: () => ({}),
        },
        {
          id: 'health_data',
          title: 'Health Data',
          description: 'OPD, immunization, ANC, deliveries, family planning, TB',
          icon: Heart,
          component: HealthDataSection,
          validate: validateNoNegatives('health_data'),
        },
        {
          id: 'facility_support',
          title: 'Facility Support',
          description: 'Renovations, donations, and repairs to health facilities',
          icon: Building,
          component: FacilitySupportWrapper,
          validate: () => ({}),
        },
        {
          id: 'transport',
          title: 'Transport & Emergency',
          description: 'Women and children transported to health facilities',
          icon: Truck,
          component: TransportEmergencySection,
          validate: validateNoNegatives('transport'),
        },
        {
          id: 'cmpdsr',
          title: 'MPDSR',
          description: 'Maternal and perinatal death surveillance and response',
          icon: Skull,
          component: CMPDSRWrapper,
          validate: validateNoNegatives('cmpdsr'),
        },
      ];

      // Community Feedback section only for Quarterly Town Hall
      if (formData.meeting_type === 'Quarterly Town Hall') {
        baseSections.push({
          id: 'community_feedback',
          title: 'Community Feedback',
          description: 'Town hall feedback on health services',
          icon: MessageSquare,
          component: CommunityFeedbackWrapper,
          validate: () => ({}),
        });
      }

      baseSections.push(
        {
          id: 'vdc_reports',
          title: 'VDC Reports',
          description: 'Reports from Village Development Committees',
          icon: MapPin,
          component: VDCReportsWrapper,
          validate: () => ({}),
        },
        {
          id: 'mobilization',
          title: 'Mobilization',
          description: 'Awareness topics and community leader support',
          icon: Users,
          component: MobilizationWrapper,
          validate: () => ({}),
        },
        {
          id: 'action_plan',
          title: 'Action Plan',
          description: 'Community action plan with timelines and responsible persons',
          icon: Calendar,
          component: ActionPlanWrapper,
          validate: () => ({}),
        },
        {
          id: 'conclusion',
          title: 'Conclusion',
          description: 'Support required, attendance, photos, and signatures',
          icon: AlertTriangle,
          component: ConclusionWrapper,
          validate: validateNoNegatives('conclusion'),
        }
      );

      return baseSections;
    },
    // Dependencies now only include stable wrappers and meeting_type
    [formData.meeting_type, MeetingDetailsWrapper, ActionTrackerWrapper, FacilitySupportWrapper, CMPDSRWrapper, CommunityFeedbackWrapper, VDCReportsWrapper, MobilizationWrapper, ActionPlanWrapper, ConclusionWrapper]
  );

  return (
    <FormWizard
      sections={sections}
      formData={enrichedFormData}
      onChange={onChange}
      onSubmit={onSubmit}
      onSaveDraft={onSaveDraft}
      draftStatus={draftStatus}
      submitDisabled={submitDisabled}
      submitDisabledMessage={submitDisabledMessage}
    />
  );
};

export default WDCReportWizard;
