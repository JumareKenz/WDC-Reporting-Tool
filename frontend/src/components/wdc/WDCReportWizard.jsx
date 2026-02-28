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
const WDCReportWizard = ({
  formData,
  onChange,
  onSubmit,
  onSaveDraft,
  draftStatus = 'idle',
  onVoiceNote,
  userLGA,
  userWard,
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

  const sections = useMemo(
    () => {
      const baseSections = [
        {
          id: 'meeting',
          title: 'Meeting Details',
          description: 'Report date, meeting type, and agenda items covered',
          icon: FileText,
          component: (props) => (
            <MeetingDetailsSection {...props} userLGA={userLGA} userWard={userWard} />
          ),
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
          component: ActionTrackerSection,
          validate: () => ({}),
        },
        {
          id: 'health_data',
          title: 'Health Data',
          description: 'OPD, immunization, ANC, deliveries, family planning, TB',
          icon: Heart,
          component: HealthDataSection,
          validate: () => ({}),
        },
        {
          id: 'facility_support',
          title: 'Facility Support',
          description: 'Renovations, donations, and repairs to health facilities',
          icon: Building,
          component: FacilitySupportSection,
          validate: () => ({}),
        },
        {
          id: 'transport',
          title: 'Transport & Emergency',
          description: 'Women and children transported to health facilities',
          icon: Truck,
          component: TransportEmergencySection,
          validate: () => ({}),
        },
        {
          id: 'cmpdsr',
          title: 'MPDSR',
          description: 'Maternal and perinatal death surveillance and response',
          icon: Skull,
          component: CMPDSRSection,
          validate: () => ({}),
        },
      ];

      // Community Feedback section only for Quarterly Town Hall
      if (formData.meeting_type === 'Quarterly Town Hall') {
        baseSections.push({
          id: 'community_feedback',
          title: 'Community Feedback',
          description: 'Town hall feedback on health services',
          icon: MessageSquare,
          component: CommunityFeedbackSection,
          validate: () => ({}),
        });
      }

      baseSections.push(
        {
          id: 'vdc_reports',
          title: 'VDC Reports',
          description: 'Reports from Village Development Committees',
          icon: MapPin,
          component: VDCReportsSection,
          validate: () => ({}),
        },
        {
          id: 'mobilization',
          title: 'Mobilization',
          description: 'Awareness topics and community leader support',
          icon: Users,
          component: (props) => <MobilizationSection {...props} onVoiceNote={onVoiceNote} />,
          validate: () => ({}),
        },
        {
          id: 'action_plan',
          title: 'Action Plan',
          description: 'Community action plan with timelines and responsible persons',
          icon: Calendar,
          component: ActionPlanSection,
          validate: () => ({}),
        },
        {
          id: 'conclusion',
          title: 'Conclusion',
          description: 'Support required, attendance, photos, and signatures',
          icon: AlertTriangle,
          component: (props) => <ConclusionSection {...props} onVoiceNote={onVoiceNote} />,
          validate: () => ({}),
        }
      );

      return baseSections;
    },
    [userLGA, userWard, onVoiceNote, formData.meeting_type]
  );

  return (
    <FormWizard
      sections={sections}
      formData={enrichedFormData}
      onChange={onChange}
      onSubmit={onSubmit}
      onSaveDraft={onSaveDraft}
      draftStatus={draftStatus}
    />
  );
};

export default WDCReportWizard;
