import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../../api/client';
import { COLORS } from '../../utils/constants';
import { formatDate, formatMonth } from '../../utils/formatters';
import LoadingSpinner from '../../components/LoadingSpinner';
import Badge from '../../components/Badge';

const MyReportsScreen = () => {
  const navigation = useNavigation();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['myReports'],
    queryFn: async () => {
      const response = await apiClient.get('/reports');
      return response;
    },
  });

  const reports = data?.data?.reports || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Reports</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        {isLoading ? (
          <LoadingSpinner text="Loading reports..." />
        ) : reports.length > 0 ? (
          <View style={styles.reportsList}>
            {reports.map((report) => (
              <TouchableOpacity
                key={report.id}
                style={styles.reportItem}
                onPress={() => navigation.navigate('ReportDetails', { reportId: report.id })}
                activeOpacity={0.7}
              >
                <View style={styles.reportHeader}>
                  <Text style={styles.reportMonth}>{formatMonth(report.report_month)}</Text>
                  <Badge status={report.status} label={report.status} />
                </View>
                <Text style={styles.reportDate}>{formatDate(report.submitted_at)}</Text>
                <View style={styles.reportStats}>
                  <View style={styles.statItem}>
                    <Ionicons name="people-outline" size={16} color={COLORS.neutral[600]} />
                    <Text style={styles.statText}>{report.attendees_count || 0} attendees</Text>
                  </View>
                  {report.has_voice_note && (
                    <View style={styles.statItem}>
                      <Ionicons name="mic" size={16} color={COLORS.primary[600]} />
                      <Text style={styles.statText}>Voice note</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={COLORS.neutral[300]} />
            <Text style={styles.emptyStateText}>No reports yet</Text>
            <Text style={styles.emptyStateSubtext}>Submit your first monthly report to get started</Text>
          </View>
        )}
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
  reportsList: {
    padding: 20,
    gap: 12,
  },
  reportItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportMonth: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.neutral[900],
  },
  reportDate: {
    fontSize: 14,
    color: COLORS.neutral[600],
    marginBottom: 12,
  },
  reportStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: COLORS.neutral[600],
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.neutral[600],
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.neutral[500],
    marginTop: 8,
    textAlign: 'center',
  },
});

export default MyReportsScreen;
