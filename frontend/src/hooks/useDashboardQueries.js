import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import apiClient from '../api/client';

/**
 * Dashboard Data Hooks with Smart Invalidation
 * 
 * Features:
 * - Automatic polling for dashboard data
 * - Smart cache invalidation on mutations
 * - Data freshness tracking
 */

// Query key factories
export const queryKeys = {
  reports: (filters) => ['reports', filters],
  report: (id) => ['report', id],
  analytics: {
    overview: () => ['analytics', 'overview'],
    trends: () => ['analytics', 'trends'],
    lgaComparison: () => ['analytics', 'lgaComparison'],
    overviewLGA: (lgaId) => ['analytics', 'lga', lgaId],
    submissions: (month) => ['analytics', 'submissions', month],
  },
  notifications: () => ['notifications'],
  form: (id) => ['form', id],
  forms: () => ['forms'],
  users: () => ['users'],
  wards: (lgaId) => ['wards', lgaId],
  lgas: () => ['lgas'],
};

// ==================== WDC Dashboard ====================

/**
 * Get WDC dashboard data with polling
 */
export const useWDCDashboard = (reportMonth) => {
  return useQuery({
    queryKey: queryKeys.reports({ month: reportMonth, type: 'my-ward' }),
    queryFn: async () => {
      const response = await apiClient.get(`/reports?month=${reportMonth}&my_ward=true`);
      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: (query) => {
      // Only poll if window is visible and component is mounted
      return document.hidden ? false : 2 * 60 * 1000; // 2 minutes
    },
    refetchIntervalInBackground: false,
  });
};

/**
 * Check submission status
 */
export const useCheckSubmission = (reportMonth) => {
  return useQuery({
    queryKey: ['submission-status', reportMonth],
    queryFn: async () => {
      const response = await apiClient.get(`/reports/check-submission?month=${reportMonth}`);
      return response.data;
    },
    staleTime: 30 * 1000,
    refetchInterval: document.hidden ? false : 60 * 1000, // 1 minute
  });
};

// ==================== LGA Dashboard ====================

/**
 * Get LGA dashboard data
 */
export const useLGADashboard = (reportMonth) => {
  return useQuery({
    queryKey: ['lga-dashboard', reportMonth],
    queryFn: async () => {
      const response = await apiClient.get(`/analytics/lga-overview?month=${reportMonth}`);
      return response.data;
    },
    staleTime: 60 * 1000,
    refetchInterval: document.hidden ? false : 3 * 60 * 1000, // 3 minutes
  });
};

/**
 * Get LGA wards with submission status
 */
export const useLGAWards = (lgaId, reportMonth) => {
  return useQuery({
    queryKey: ['lga-wards', lgaId, reportMonth],
    queryFn: async () => {
      const response = await apiClient.get(`/lgas/${lgaId}/wards?month=${reportMonth}`);
      return response.data;
    },
    staleTime: 60 * 1000,
    refetchInterval: document.hidden ? false : 3 * 60 * 1000,
    enabled: !!lgaId,
  });
};

// ==================== State Dashboard ====================

/**
 * Get state overview with frequent polling
 */
export const useStateOverview = () => {
  return useQuery({
    queryKey: queryKeys.analytics.overview(),
    queryFn: async () => {
      const response = await apiClient.get('/analytics/overview');
      return response.data;
    },
    staleTime: 30 * 1000,
    refetchInterval: document.hidden ? false : 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Get submission trends
 */
export const useTrends = (months = 6) => {
  return useQuery({
    queryKey: queryKeys.analytics.trends(),
    queryFn: async () => {
      const response = await apiClient.get(`/analytics/trends?months=${months}`);
      return response.data;
    },
    staleTime: 60 * 1000,
    refetchInterval: document.hidden ? false : 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Get LGA comparison data
 */
export const useLGAComparison = (reportMonth) => {
  return useQuery({
    queryKey: queryKeys.analytics.lgaComparison(),
    queryFn: async () => {
      const response = await apiClient.get(`/analytics/lga-comparison?month=${reportMonth}`);
      return response.data;
    },
    staleTime: 60 * 1000,
    refetchInterval: document.hidden ? false : 3 * 60 * 1000,
  });
};

// ==================== Shared ====================

/**
 * Get notifications
 */
export const useNotifications = () => {
  return useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: async () => {
      const response = await apiClient.get('/notifications');
      return response.data;
    },
    staleTime: 30 * 1000,
    refetchInterval: document.hidden ? false : 60 * 1000,
  });
};

/**
 * Get active form
 */
export const useActiveForm = () => {
  return useQuery({
    queryKey: queryKeys.forms(),
    queryFn: async () => {
      const response = await apiClient.get('/forms/active');
      return response.data;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - forms don't change often
  });
};

// ==================== Mutations with Cache Invalidation ====================

/**
 * Submit report with smart cache invalidation
 */
export const useSubmitReport = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/reports', data);
      return response.data;
    },
    onSuccess: (result, variables) => {
      // Invalidate all related caches
      queryClient.invalidateQueries({ queryKey: ['submission-status'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['lga-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      // Optimistically update state dashboard
      queryClient.setQueryData(
        queryKeys.analytics.overview(),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            total_reports: (old.total_reports || 0) + 1,
            submission_rate: calculateNewRate(old, 1)
          };
        }
      );
    },
  });
};

/**
 * Review report
 */
export const useReviewReport = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ reportId, status, comments }) => {
      const response = await apiClient.put(`/reports/${reportId}/review`, {
        status,
        comments
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['lga-dashboard'] });
    },
  });
};

/**
 * Send notification
 */
export const useSendNotification = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/notifications', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

// Helper to calculate new submission rate
function calculateNewRate(oldData, change) {
  const total = (oldData.total_wards || 1);
  const submitted = (oldData.submitted_count || 0) + change;
  return Math.round((submitted / total) * 100);
}

export default {
  useWDCDashboard,
  useCheckSubmission,
  useLGADashboard,
  useLGAWards,
  useStateOverview,
  useTrends,
  useLGAComparison,
  useNotifications,
  useActiveForm,
  useSubmitReport,
  useReviewReport,
  useSendNotification,
  queryKeys,
};
