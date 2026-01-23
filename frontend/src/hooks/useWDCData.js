import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getReports,
  getReportById,
  submitReport,
  updateReport,
  checkSubmitted,
  downloadVoiceNote,
  deleteVoiceNote,
} from '../api/reports';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../api/notifications';

/**
 * Query Keys
 */
export const WDC_QUERY_KEYS = {
  reports: 'wdc-reports',
  reportById: (id) => ['wdc-report', id],
  checkSubmission: (month) => ['check-submission', month],
  notifications: 'wdc-notifications',
};

/**
 * Hook to fetch reports for WDC secretary
 */
export const useReports = (params = {}) => {
  return useQuery({
    queryKey: [WDC_QUERY_KEYS.reports, params],
    queryFn: () => getReports(params),
    staleTime: 60000, // 1 minute
  });
};

/**
 * Hook to fetch a single report by ID
 */
export const useReportById = (reportId) => {
  return useQuery({
    queryKey: WDC_QUERY_KEYS.reportById(reportId),
    queryFn: () => getReportById(reportId),
    enabled: !!reportId,
    staleTime: 60000,
  });
};

/**
 * Hook to check if report has been submitted for a month
 */
export const useCheckSubmission = (month) => {
  return useQuery({
    queryKey: WDC_QUERY_KEYS.checkSubmission(month),
    queryFn: () => checkSubmitted(month),
    enabled: !!month,
    staleTime: 30000, // 30 seconds
  });
};

/**
 * Hook to submit a new report
 */
export const useSubmitReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitReport,
    onSuccess: () => {
      // Invalidate reports queries
      queryClient.invalidateQueries({ queryKey: [WDC_QUERY_KEYS.reports] });
      queryClient.invalidateQueries({ queryKey: ['check-submission'] });
    },
  });
};

/**
 * Hook to update an existing report
 */
export const useUpdateReport = (reportId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => updateReport(reportId, data),
    onSuccess: () => {
      // Invalidate specific report and reports list
      queryClient.invalidateQueries({
        queryKey: WDC_QUERY_KEYS.reportById(reportId),
      });
      queryClient.invalidateQueries({ queryKey: [WDC_QUERY_KEYS.reports] });
    },
  });
};

/**
 * Hook to download voice note
 */
export const useDownloadVoiceNote = () => {
  return useMutation({
    mutationFn: ({ voiceNoteId, filename }) =>
      downloadVoiceNote(voiceNoteId, filename),
  });
};

/**
 * Hook to delete voice note
 */
export const useDeleteVoiceNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteVoiceNote,
    onSuccess: (data, voiceNoteId) => {
      // Invalidate reports queries
      queryClient.invalidateQueries({ queryKey: [WDC_QUERY_KEYS.reports] });
    },
  });
};

/**
 * Hook to fetch notifications
 */
export const useNotifications = (params = {}) => {
  return useQuery({
    queryKey: [WDC_QUERY_KEYS.notifications, params],
    queryFn: () => getNotifications(params),
    staleTime: 30000, // 30 seconds
  });
};

/**
 * Hook to mark notification as read
 */
export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      // Invalidate notifications queries
      queryClient.invalidateQueries({ queryKey: [WDC_QUERY_KEYS.notifications] });
    },
  });
};

/**
 * Hook to mark all notifications as read
 */
export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      // Invalidate notifications queries
      queryClient.invalidateQueries({ queryKey: [WDC_QUERY_KEYS.notifications] });
    },
  });
};
