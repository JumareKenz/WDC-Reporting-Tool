import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOverview,
  getLGAComparison,
  getTrends,
  generateAIReport,
  getLGAs,
  getInvestigations,
  createInvestigation,
  updateInvestigation,
} from '../api/analytics';

export const STATE_QUERY_KEYS = {
  overview: 'state-overview',
  lgaComparison: 'state-lga-comparison',
  trends: 'state-trends',
  lgas: 'state-lgas',
  investigations: 'state-investigations',
};

export const useOverview = (params = {}) => {
  return useQuery({
    queryKey: [STATE_QUERY_KEYS.overview, params],
    queryFn: () => getOverview(params),
    staleTime: 60000,
  });
};

export const useLGAComparison = (params = {}) => {
  return useQuery({
    queryKey: [STATE_QUERY_KEYS.lgaComparison, params],
    queryFn: () => getLGAComparison(params),
    staleTime: 60000,
  });
};

export const useTrends = (params = {}) => {
  return useQuery({
    queryKey: [STATE_QUERY_KEYS.trends, params],
    queryFn: () => getTrends(params),
    staleTime: 60000,
  });
};

export const useGenerateAIReport = () => {
  return useMutation({
    mutationFn: generateAIReport,
  });
};

export const useLGAs = () => {
  return useQuery({
    queryKey: [STATE_QUERY_KEYS.lgas],
    queryFn: getLGAs,
    staleTime: 300000, // 5 minutes
  });
};

export const useInvestigations = (params = {}) => {
  return useQuery({
    queryKey: [STATE_QUERY_KEYS.investigations, params],
    queryFn: () => getInvestigations(params),
    staleTime: 30000,
  });
};

export const useCreateInvestigation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInvestigation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.investigations] });
    },
  });
};

export const useUpdateInvestigation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ investigationId, data }) => updateInvestigation(investigationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.investigations] });
    },
  });
};
