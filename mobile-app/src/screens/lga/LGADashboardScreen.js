import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import apiClient, { buildQueryString } from '../../api/client';
import { COLORS } from '../../utils/constants';
import { formatMonth, getCurrentMonth } from '../../utils/formatters';
import { IconCard } from '../../components/Card';
import Button from '../../components/Button';
import LoadingSpinner from '../../components/LoadingSpinner';

const LGADashboardScreen = () => {
  const { user } = useAuth();
  const currentMonth = getCurrentMonth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['lgaWards', user?.lga_id, currentMonth],
    queryFn: async () => {
      const query = buildQueryString({ month: currentMonth });
      const response = await apiClient.get(`/lgas/${user?.lga_id}/wards${query}`);
      return response;
    },
  });

  const summary = data?.data?.summary || {
    total_wards: 0,
    submitted: 0,
    missing: 0,
    submission_rate: 0,
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>LGA Coordinator</Text>
          <Text style={styles.headerSubtitle}>
            {user?.lga?.name || 'Your LGA'} • {formatMonth(currentMonth)}
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.statsGrid}>
            <IconCard
              icon="location"
              iconColor="primary"
              title="Total Wards"
              value={summary.total_wards}
              subtitle="In your LGA"
            />
            <IconCard
              icon="checkmark-circle"
              iconColor="success"
              title="Submitted"
              value={summary.submitted}
              subtitle={`${summary.submission_rate}% rate`}
            />
            <IconCard
              icon="warning"
              iconColor={summary.missing > 0 ? 'warning' : 'success'}
              title="Missing"
              value={summary.missing}
              subtitle={summary.missing > 0 ? 'Action required' : 'All caught up!'}
            />
          </View>

          <View style={styles.actions}>
            <Button icon="location-outline" variant="outline" fullWidth>
              View All Wards
            </Button>
            <Button icon="document-text-outline" variant="outline" fullWidth>
              View All Reports
            </Button>
            <Button icon="notifications-outline" variant="primary" fullWidth disabled={summary.missing === 0}>
              Send Reminders ({summary.missing})
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
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[200],
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.neutral[900],
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.neutral[600],
    marginTop: 4,
  },
  content: {
    padding: 20,
  },
  statsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  actions: {
    gap: 12,
  },
});

export default LGADashboardScreen;
