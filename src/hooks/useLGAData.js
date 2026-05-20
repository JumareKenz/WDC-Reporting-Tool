import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getLGAReports,
  getLGASecretaries,
  openReview,
  approveReport,
  returnReport,
  sendNotification,
  getFeedback,
  markFeedbackRead,
} from '../api/lga';

export const LGA_QUERY_KEYS = {
  reports:     'lga-reports',
  secretaries: 'lga-secretaries',
  feedback:    'lga-feedback',
};

export const useLGAReports = (params = {}) =>
  useQuery({
    queryKey: [LGA_QUERY_KEYS.reports, params],
    queryFn:  () => getLGAReports(params),
    staleTime: 30_000,
  });

export const useLGASecretaries = (params = {}) =>
  useQuery({
    queryKey: [LGA_QUERY_KEYS.secretaries, params],
    queryFn:  () => getLGASecretaries(params),
    staleTime: 60_000,
  });

/** Open a submitted report for review, then approve or return it. */
export const useCoordinatorReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, action, notes }) => {
      if (action === 'open')    return openReview(reportId);
      if (action === 'approve') return approveReport(reportId);
      return returnReport(reportId, notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LGA_QUERY_KEYS.reports] });
    },
  });
};

export const useSendNotification = () =>
  useMutation({ mutationFn: sendNotification });

export const useFeedback = (params = {}) =>
  useQuery({
    queryKey: [LGA_QUERY_KEYS.feedback, params],
    queryFn:  () => getFeedback(params),
    staleTime: 30_000,
  });

export const useMarkFeedbackRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markFeedbackRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LGA_QUERY_KEYS.feedback] });
    },
  });
};
