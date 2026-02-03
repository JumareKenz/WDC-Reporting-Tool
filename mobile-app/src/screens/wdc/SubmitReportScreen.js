import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert as RNAlert,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../../api/client';
import { COLORS, KADUNA_LGAS, MEETING_TYPES } from '../../utils/constants';
import { getCurrentMonth } from '../../utils/formatters';
import TextInput from '../../components/TextInput';
import Button from '../../components/Button';
import Alert from '../../components/Alert';
import VoiceRecorder from '../../components/VoiceRecorder';

const SubmitReportScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();

  const [formData, setFormData] = useState({
    report_month: getCurrentMonth(),
    meeting_type: 'Monthly',
    meetings_held: '',
    attendees_count: '',
    issues_identified: '',
    actions_taken: '',
    challenges: '',
    recommendations: '',
    // Health data fields
    health_penta1: '',
    health_bcg: '',
    health_penta3: '',
    health_measles: '',
    health_anc_first_visit: '',
    health_deliveries: '',
    // Add more fields as needed from the web version
  });

  const [voiceNotes, setVoiceNotes] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleVoiceNote = (fieldName, file) => {
    setVoiceNotes((prev) => ({ ...prev, [fieldName]: file }));
  };

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      const formPayload = new FormData();
      formPayload.append('report_data', JSON.stringify(data));

      Object.entries(voiceNotes).forEach(([fieldName, file]) => {
        if (file) {
          formPayload.append(`voice_${fieldName}`, {
            uri: file.uri,
            name: file.name,
            type: file.type,
          });
        }
      });

      const response = await apiClient.post('/reports', formPayload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response;
    },
    onSuccess: () => {
      setSubmitSuccess(true);
      RNAlert.alert(
        'Success',
        'Your report has been submitted successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Dashboard'),
          },
        ]
      );
    },
    onError: (error) => {
      setSubmitError(error.message || 'Failed to submit report');
    },
  });

  const handleSubmit = () => {
    setSubmitError(null);

    if (!formData.meetings_held || !formData.attendees_count) {
      setSubmitError('Please fill in all required fields');
      return;
    }

    submitMutation.mutate(formData);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.neutral[900]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Submit Monthly Report</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          {submitError && <Alert type="error" message={submitError} onClose={() => setSubmitError(null)} />}

          <Alert
            type="info"
            title="WDC Monthly Report Form"
            message="Complete all required sections. Tap the microphone icon to add voice notes."
          />

          {/* Header Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Report Information</Text>

            <TextInput
              label="Month *"
              value={formData.report_month}
              editable={false}
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Meeting Type *</Text>
              <View style={styles.radioGroup}>
                {MEETING_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={styles.radioOption}
                    onPress={() => handleChange('meeting_type', type)}
                  >
                    <View
                      style={[
                        styles.radio,
                        formData.meeting_type === type && styles.radioSelected,
                      ]}
                    >
                      {formData.meeting_type === type && (
                        <View style={styles.radioInner} />
                      )}
                    </View>
                    <Text style={styles.radioLabel}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.fieldWithVoice}>
              <TextInput
                label="Number of Meetings Held *"
                value={formData.meetings_held}
                onChangeText={(value) => handleChange('meetings_held', value)}
                keyboardType="numeric"
                placeholder="0"
              />
              <VoiceRecorder
                fieldName="meetings_held"
                onRecordingComplete={(file) => handleVoiceNote('meetings_held', file)}
                compact
              />
            </View>

            <View style={styles.fieldWithVoice}>
              <TextInput
                label="Total Attendees *"
                value={formData.attendees_count}
                onChangeText={(value) => handleChange('attendees_count', value)}
                keyboardType="numeric"
                placeholder="0"
              />
              <VoiceRecorder
                fieldName="attendees_count"
                onRecordingComplete={(file) => handleVoiceNote('attendees_count', file)}
                compact
              />
            </View>
          </View>

          {/* Issues & Actions Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Issues & Actions</Text>

            <View style={styles.fieldWithVoice}>
              <TextInput
                label="Issues Identified"
                value={formData.issues_identified}
                onChangeText={(value) => handleChange('issues_identified', value)}
                multiline
                numberOfLines={4}
                placeholder="Describe any issues identified..."
              />
              <VoiceRecorder
                fieldName="issues_identified"
                onRecordingComplete={(file) => handleVoiceNote('issues_identified', file)}
                compact
              />
            </View>

            <View style={styles.fieldWithVoice}>
              <TextInput
                label="Actions Taken"
                value={formData.actions_taken}
                onChangeText={(value) => handleChange('actions_taken', value)}
                multiline
                numberOfLines={4}
                placeholder="Describe actions taken..."
              />
              <VoiceRecorder
                fieldName="actions_taken"
                onRecordingComplete={(file) => handleVoiceNote('actions_taken', file)}
                compact
              />
            </View>

            <View style={styles.fieldWithVoice}>
              <TextInput
                label="Challenges"
                value={formData.challenges}
                onChangeText={(value) => handleChange('challenges', value)}
                multiline
                numberOfLines={4}
                placeholder="Describe any challenges..."
              />
              <VoiceRecorder
                fieldName="challenges"
                onRecordingComplete={(file) => handleVoiceNote('challenges', file)}
                compact
              />
            </View>

            <View style={styles.fieldWithVoice}>
              <TextInput
                label="Recommendations"
                value={formData.recommendations}
                onChangeText={(value) => handleChange('recommendations', value)}
                multiline
                numberOfLines={4}
                placeholder="Your recommendations..."
              />
              <VoiceRecorder
                fieldName="recommendations"
                onRecordingComplete={(file) => handleVoiceNote('recommendations', file)}
                compact
              />
            </View>
          </View>

          {/* Health Data Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Health System Data</Text>
            <Text style={styles.sectionSubtitle}>Immunization</Text>

            <View style={styles.gridRow}>
              <View style={styles.gridColumn}>
                <TextInput
                  label="PENTA1"
                  value={formData.health_penta1}
                  onChangeText={(value) => handleChange('health_penta1', value)}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
              <View style={styles.gridColumn}>
                <TextInput
                  label="BCG"
                  value={formData.health_bcg}
                  onChangeText={(value) => handleChange('health_bcg', value)}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridColumn}>
                <TextInput
                  label="PENTA3"
                  value={formData.health_penta3}
                  onChangeText={(value) => handleChange('health_penta3', value)}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
              <View style={styles.gridColumn}>
                <TextInput
                  label="Measles"
                  value={formData.health_measles}
                  onChangeText={(value) => handleChange('health_measles', value)}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
            </View>

            <Text style={[styles.sectionSubtitle, { marginTop: 16 }]}>ANC & Deliveries</Text>

            <View style={styles.gridRow}>
              <View style={styles.gridColumn}>
                <TextInput
                  label="ANC 1st Visit"
                  value={formData.health_anc_first_visit}
                  onChangeText={(value) => handleChange('health_anc_first_visit', value)}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
              <View style={styles.gridColumn}>
                <TextInput
                  label="Deliveries"
                  value={formData.health_deliveries}
                  onChangeText={(value) => handleChange('health_deliveries', value)}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
            </View>
          </View>

          {/* Voice Notes Summary */}
          {Object.keys(voiceNotes).length > 0 && (
            <View style={styles.voiceNotesSection}>
              <Text style={styles.voiceNotesTitle}>
                Voice Notes ({Object.keys(voiceNotes).length})
              </Text>
              <View style={styles.voiceNotesList}>
                {Object.keys(voiceNotes).map((key) => (
                  <View key={key} style={styles.voiceNoteChip}>
                    <Ionicons name="mic" size={12} color={COLORS.primary[700]} />
                    <Text style={styles.voiceNoteText}>{key.replace(/_/g, ' ')}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Submit Button */}
          <View style={styles.submitSection}>
            <Button
              variant="secondary"
              fullWidth
              onPress={() => navigation.goBack()}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              icon="send"
              loading={submitMutation.isPending}
              onPress={handleSubmit}
            >
              Submit Report
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[200],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.neutral[900],
  },
  content: {
    padding: 20,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.neutral[900],
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neutral[700],
    marginBottom: 12,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neutral[700],
    marginBottom: 8,
  },
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioSelected: {
    borderColor: COLORS.primary[600],
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary[600],
  },
  radioLabel: {
    fontSize: 14,
    color: COLORS.neutral[700],
  },
  fieldWithVoice: {
    position: 'relative',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridColumn: {
    flex: 1,
  },
  voiceNotesSection: {
    backgroundColor: COLORS.info[50],
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  voiceNotesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.info[800],
    marginBottom: 12,
  },
  voiceNotesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  voiceNoteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.primary[100],
    borderRadius: 12,
  },
  voiceNoteText: {
    fontSize: 12,
    color: COLORS.primary[700],
  },
  submitSection: {
    gap: 12,
    marginTop: 8,
  },
});

export default SubmitReportScreen;
