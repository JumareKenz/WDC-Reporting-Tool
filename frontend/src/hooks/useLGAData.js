import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getLGA,
  getLGAWards,
  getLGAReports,
  getLGAMissingReports,
  sendNotification,
  reviewReport,
  getFeedback,
  sendFeedback,
} from '../api/lga';

export const LGA_QUERY_KEYS = {
  lga: (id) => ['lga', id],
  wards: (id) => ['lga-wards', id],
  reports: (id) => ['lga-reports', id],
  missingReports: (id) => ['lga-missing-reports', id],
  feedback: 'lga-feedback',
};

export const useLGA = (lgaId) => {
  return useQuery({
    queryKey: LGA_QUERY_KEYS.lga(lgaId),
    queryFn: () => getLGA(lgaId),
    enabled: !!lgaId,
    staleTime: 60000,
  });
};

export const useLGAWards = (lgaId, params = {}) => {
  return useQuery({
    queryKey: [...LGA_QUERY_KEYS.wards(lgaId), params],
    queryFn: () => getLGAWards(lgaId, params),
    enabled: !!lgaId,
    staleTime: 30000,
  });
};

export const useLGAReports = (lgaId, params = {}) => {
  return useQuery({
    queryKey: [...LGA_QUERY_KEYS.reports(lgaId), params],
    queryFn: () => getLGAReports(lgaId, params),
    enabled: !!lgaId,
    staleTime: 30000,
  });
};

export const useLGAMissingReports = (lgaId, params = {}) => {
  return useQuery({
    queryKey: [...LGA_QUERY_KEYS.missingReports(lgaId), params],
    queryFn: () => getLGAMissingReports(lgaId, params),
    enabled: !!lgaId,
    staleTime: 30000,
  });
};

export const useSendNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lga-missing-reports'] });
    },
  });
};

export const useReviewReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, data }) => reviewReport(reportId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lga-reports'] });
      queryClient.invalidateQueries({ queryKey: ['lga-wards'] });
    },
  });
};

export const useFeedback = (params = {}) => {
  return useQuery({
    queryKey: [LGA_QUERY_KEYS.feedback, params],
    queryFn: () => getFeedback(params),
    staleTime: 30000,
  });
};

export const useSendFeedback = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendFeedback,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LGA_QUERY_KEYS.feedback] });
    },
  });
};
