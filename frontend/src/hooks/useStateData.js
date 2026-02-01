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
  getStateSubmissions,
} from '../api/analytics';
import {
  getForms,
  createForm,
  updateForm,
  deployForm,
} from '../api/forms';
import {
  getUsersSummary,
  getLGACoordinator,
  getWardSecretary,
  updateUser,
  changeUserPassword,
  toggleUserAccess,
  assignUser,
} from '../api/users';

export const STATE_QUERY_KEYS = {
  overview: 'state-overview',
  lgaComparison: 'state-lga-comparison',
  trends: 'state-trends',
  lgas: 'state-lgas',
  investigations: 'state-investigations',
  forms: 'state-forms',
  stateSubmissions: 'state-submissions',
  usersSummary: 'state-users-summary',
  coordinator: 'state-coordinator',
  secretary: 'state-secretary',
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

export const useForms = (params = {}) => {
  return useQuery({
    queryKey: [STATE_QUERY_KEYS.forms, params],
    queryFn: () => getForms(params),
    staleTime: 30000,
  });
};

export const useCreateForm = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createForm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.forms] });
    },
  });
};

export const useUpdateForm = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ formId, data }) => updateForm(formId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.forms] });
    },
  });
};

export const useDeployForm = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deployForm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.forms] });
    },
  });
};

export const useStateSubmissions = (params = {}) => {
  return useQuery({
    queryKey: [STATE_QUERY_KEYS.stateSubmissions, params],
    queryFn: () => getStateSubmissions(params),
    staleTime: 30000,
  });
};

export const useUsersSummary = () => {
  return useQuery({
    queryKey: [STATE_QUERY_KEYS.usersSummary],
    queryFn: getUsersSummary,
    staleTime: 60000,
  });
};

export const useLGACoordinator = (lgaId) => {
  return useQuery({
    queryKey: [STATE_QUERY_KEYS.coordinator, lgaId],
    queryFn: () => getLGACoordinator(lgaId),
    enabled: !!lgaId,
    staleTime: 30000,
  });
};

export const useWardSecretary = (wardId) => {
  return useQuery({
    queryKey: [STATE_QUERY_KEYS.secretary, wardId],
    queryFn: () => getWardSecretary(wardId),
    enabled: !!wardId,
    staleTime: 30000,
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }) => updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.coordinator] });
      queryClient.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.secretary] });
    },
  });
};

export const useChangeUserPassword = () => {
  return useMutation({
    mutationFn: ({ userId, data }) => changeUserPassword(userId, data),
  });
};

export const useToggleUserAccess = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }) => toggleUserAccess(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.coordinator] });
      queryClient.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.secretary] });
      queryClient.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.usersSummary] });
    },
  });
};

export const useAssignUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => assignUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.coordinator] });
      queryClient.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.secretary] });
      queryClient.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.usersSummary] });
    },
  });
};
