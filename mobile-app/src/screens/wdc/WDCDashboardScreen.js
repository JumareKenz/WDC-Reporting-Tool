import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import apiClient, { buildQueryString } from '../../api/client';
import { COLORS } from '../../utils/constants';
import { formatDate, formatMonth, getCurrentMonth } from '../../utils/formatters';
import { IconCard } from '../../components/Card';
import Button from '../../components/Button';
import Alert from '../../components/Alert';
import LoadingSpinner from '../../components/LoadingSpinner';
import Badge from '../../components/Badge';

const WDCDashboardScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const currentMonth = getCurrentMonth();

  // Fetch submission status
  const {
    data: submissionData,
    isLoading: loadingSubmission,
    refetch: refetchSubmission,
  } = useQuery({
    queryKey: ['checkSubmission', currentMonth],
    queryFn: async () => {
      const query = buildQueryString({ month: currentMonth });
      const response = await apiClient.get(`/reports/check-submitted${query}`);
      return response;
    },
  });

  // Fetch reports history
  const {
    data: reportsData,
    isLoading: loadingReports,
    refetch: refetchReports,
  } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const response = await apiClient.get('/reports?limit=10');
      return response;
    },
  });

  // Fetch notifications
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await apiClient.get('/notifications?unread_only=true&limit=5');
      return response;
    },
  });

  const isSubmitted = submissionData?.data?.submitted || false;
  const reports = reportsData?.data?.reports || [];
  const notifications = notificationsData?.data?.notifications || [];

  const totalReports = reports.length;
  const reviewedCount = reports.filter((r) => r.status === 'REVIEWED').length;

  const refreshing = loadingSubmission || loadingReports;

  const onRefresh = () => {
    refetchSubmission();
    refetchReports();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>WDC Secretary</Text>
            <Text style={styles.headerSubtitle}>
              {user?.ward?.name || 'Your Ward'} • {user?.lga?.name || 'Your LGA'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Submit')}>
            <View style={styles.addButton}>
              <Ionicons name="add" size={24} color="#ffffff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Current Month Status */}
        <View style={styles.section}>
          {!loadingSubmission && (
            <Alert
              type={isSubmitted ? 'success' : 'warning'}
              title={isSubmitted ? 'Report Submitted' : 'Action Required'}
              message={
                isSubmitted
                  ? `Your report for ${formatMonth(currentMonth)} has been submitted successfully.`
                  : `You have not submitted your report for ${formatMonth(currentMonth)} yet.`
              }
            />
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.section}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <IconCard
                icon={isSubmitted ? 'checkmark-circle' : 'time'}
                iconColor={isSubmitted ? 'success' : 'warning'}
                title="Current Month"
                value={isSubmitted ? 'Submitted' : 'Pending'}
                subtitle={formatMonth(currentMonth)}
              />
            </View>
            <View style={styles.statCard}>
              <IconCard
                icon="document-text"
                iconColor="primary"
                title="Total Reports"
                value={totalReports}
                subtitle={`${reviewedCount} reviewed`}
              />
            </View>
            <View style={styles.statCard}>
              <IconCard
                icon="notifications"
                iconColor={notifications.length > 0 ? 'warning' : 'neutral'}
                title="Notifications"
                value={notifications.length}
                subtitle={notifications.length > 0 ? 'Unread' : 'All caught up'}
              />
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <Button
              icon="add-circle"
              variant="primary"
              fullWidth
              onPress={() => navigation.navigate('Submit')}
            >
              Submit Monthly Report
            </Button>
            <Button
              icon="document-text-outline"
              variant="outline"
              fullWidth
              onPress={() => navigation.navigate('Reports')}
            >
              View My Reports
            </Button>
          </View>
        </View>

        {/* Recent Reports */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Reports</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Reports')}>
              <Text style={styles.sectionLink}>View All</Text>
            </TouchableOpacity>
          </View>

          {loadingReports ? (
            <LoadingSpinner text="Loading reports..." />
          ) : reports.length > 0 ? (
            <View style={styles.reportsList}>
              {reports.slice(0, 5).map((report) => (
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
                  <View style={styles.reportMeta}>
                    <View style={styles.reportMetaItem}>
                      <Ionicons name="calendar-outline" size={14} color={COLORS.neutral[500]} />
                      <Text style={styles.reportMetaText}>{formatDate(report.submitted_at)}</Text>
                    </View>
                    {report.has_voice_note && (
                      <View style={styles.reportMetaItem}>
                        <Ionicons name="mic" size={14} color={COLORS.primary[600]} />
                        <Text style={[styles.reportMetaText, { color: COLORS.primary[600] }]}>
                          Voice note
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={COLORS.neutral[300]} />
              <Text style={styles.emptyStateText}>No reports yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap "Submit Monthly Report" to create your first report
              </Text>
            </View>
          )}
        </View>

        {/* Recent Notifications */}
        {notifications.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Notifications</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
                <Text style={styles.sectionLink}>View All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.notificationsList}>
              {notifications.slice(0, 3).map((notification) => (
                <View key={notification.id} style={styles.notificationItem}>
                  <View style={styles.notificationIcon}>
                    <Ionicons name="notifications" size={20} color={COLORS.primary[600]} />
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    <Text style={styles.notificationMessage} numberOfLines={2}>
                      {notification.message}
                    </Text>
                    <Text style={styles.notificationDate}>{formatDate(notification.created_at, true)}</Text>
                  </View>
                </View>
              ))}
            </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.neutral[900],
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLink: {
    fontSize: 14,
    color: COLORS.primary[600],
    fontWeight: '600',
  },
  statsGrid: {
    gap: 12,
  },
  statCard: {
    marginBottom: 0,
  },
  actionButtons: {
    gap: 12,
  },
  reportsList: {
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
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.neutral[900],
  },
  reportMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  reportMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reportMetaText: {
    fontSize: 12,
    color: COLORS.neutral[500],
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.neutral[600],
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.neutral[500],
    marginTop: 4,
    textAlign: 'center',
  },
  notificationsList: {
    gap: 12,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neutral[900],
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 13,
    color: COLORS.neutral[600],
    marginBottom: 4,
  },
  notificationDate: {
    fontSize: 11,
    color: COLORS.neutral[400],
  },
});

export default WDCDashboardScreen;
