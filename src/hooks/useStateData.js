import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOverview,
  getLGAComparison,
  getTrends,
  generateAIReport,
  getStateSubmissions,
} from '../api/analytics';
import apiClient from '../api/client';
import { API_ENDPOINTS } from '../utils/constants';
import { getForms, createForm, updateForm, deployForm, archiveForm, createFormVersion } from '../api/forms';
import { getUsers, getUserById, createUser, reassignUser, suspendUser, reactivateUser, deleteUser } from '../api/users';
import {
  createInvestigation,
  getInvestigations,
  getInvestigation,
  updateInvestigation,
  closeInvestigation,
  reopenInvestigation,
  addEvidence,
  removeEvidence,
} from '../api/investigations';
import { broadcast, getDeliveries, markDeliveryRead } from '../api/messages';
import { askAI } from '../api/ai';

export const STATE_QUERY_KEYS = {
  overview:         'state-overview',
  lgaComparison:    'state-lga-comparison',
  trends:           'state-trends',
  investigations:   'state-investigations',
  investigation:    (id) => ['state-investigation', id],
  forms:            'state-forms',
  stateSubmissions: 'state-submissions',
  users:            'state-users',
  user:             (id) => ['state-user', id],
  notifications:    'state-notifications',
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export const useOverview = (params = {}) =>
  useQuery({ queryKey: [STATE_QUERY_KEYS.overview, params], queryFn: () => getOverview(params), staleTime: 60_000 });

export const useLGAComparison = (params = {}) =>
  useQuery({ queryKey: [STATE_QUERY_KEYS.lgaComparison, params], queryFn: () => getLGAComparison(params), staleTime: 60_000 });

export const useTrends = (params = {}) =>
  useQuery({ queryKey: [STATE_QUERY_KEYS.trends, params], queryFn: () => getTrends(params), staleTime: 60_000 });

export const useGenerateAIReport = () =>
  useMutation({ mutationFn: generateAIReport });

export const useAskAI = () =>
  useMutation({ mutationFn: ({ question, limit }) => askAI(question, limit) });

// ── Reports / Submissions ─────────────────────────────────────────────────────

export const useStateSubmissions = (params = {}) =>
  useQuery({
    queryKey: [STATE_QUERY_KEYS.stateSubmissions, params],
    queryFn:  () => getStateSubmissions(params),
    staleTime: 30_000,
  });

// ── Investigations ────────────────────────────────────────────────────────────

export const useInvestigations = (params = {}) =>
  useQuery({
    queryKey: [STATE_QUERY_KEYS.investigations, params],
    queryFn:  () => getInvestigations(params),
    staleTime: 30_000,
  });

export const useInvestigation = (id) =>
  useQuery({
    queryKey: STATE_QUERY_KEYS.investigation(id),
    queryFn:  () => getInvestigation(id),
    enabled:  !!id,
    staleTime: 30_000,
  });

export const useCreateInvestigation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createInvestigation,
    onSuccess: () => qc.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.investigations] }),
  });
};

export const useUpdateInvestigation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateInvestigation(id, data),
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.investigations] });
      qc.invalidateQueries({ queryKey: STATE_QUERY_KEYS.investigation(id) });
    },
  });
};

export const useCloseInvestigation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: closeInvestigation,
    onSuccess: () => qc.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.investigations] }),
  });
};

export const useReopenInvestigation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reopenInvestigation,
    onSuccess: () => qc.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.investigations] }),
  });
};

export const useAddEvidence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => addEvidence(id, data),
    onSuccess: (_r, { id }) => qc.invalidateQueries({ queryKey: STATE_QUERY_KEYS.investigation(id) }),
  });
};

export const useRemoveEvidence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, evidenceId }) => removeEvidence(id, evidenceId),
    onSuccess: (_r, { id }) => qc.invalidateQueries({ queryKey: STATE_QUERY_KEYS.investigation(id) }),
  });
};

// ── Forms ─────────────────────────────────────────────────────────────────────

export const useForms = (params = {}) =>
  useQuery({ queryKey: [STATE_QUERY_KEYS.forms, params], queryFn: () => getForms(), staleTime: 30_000 });

export const useCreateForm = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: createForm, onSuccess: () => qc.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.forms] }) });
};

export const useUpdateForm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ formId, data }) => updateForm(formId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.forms] }),
  });
};

export const useDeployForm = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: deployForm, onSuccess: () => qc.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.forms] }) });
};

export const useArchiveForm = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: archiveForm, onSuccess: () => qc.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.forms] }) });
};

export const useCreateFormVersion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ formId, schema }) => createFormVersion(formId, schema),
    onSuccess: () => qc.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.forms] }),
  });
};

// ── Users ─────────────────────────────────────────────────────────────────────

export const useUsers = (params = {}) =>
  useQuery({ queryKey: [STATE_QUERY_KEYS.users, params], queryFn: () => getUsers(params), staleTime: 60_000 });

export const useUser = (id) =>
  useQuery({ queryKey: STATE_QUERY_KEYS.user(id), queryFn: () => getUserById(id), enabled: !!id, staleTime: 60_000 });

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: createUser, onSuccess: () => qc.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.users] }) });
};

export const useReassignUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }) => reassignUser(userId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.users] }),
  });
};

export const useSuspendUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: suspendUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.users] }),
  });
};

export const useReactivateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reactivateUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.users] }),
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.users] }),
  });
};

// ── Messages / Notifications ──────────────────────────────────────────────────

export const useLGAs = () =>
  useQuery({
    queryKey: ['state-lgas'],
    queryFn: () => getUsers({ role: 'coordinator' }),
    staleTime: 300_000,
  });

export const useBroadcast = () =>
  useMutation({ mutationFn: broadcast });

export const useStateNotifications = (params = {}) =>
  useQuery({
    queryKey: [STATE_QUERY_KEYS.notifications, params],
    queryFn:  () => getDeliveries(params),
    staleTime: 30_000,
  });

export const useMarkStateNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markDeliveryRead,
    onSuccess:  () => qc.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.notifications] }),
  });
};

// ── Report Review ─────────────────────────────────────────────────────────────

/**
 * Coordinator/director review: action is 'open', 'approve', or 'return'.
 */
export const useReviewReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, action, notes }) => {
      if (action === 'approve') return apiClient.post(`/reports/${reportId}/approve`);
      return apiClient.post(`/reports/${reportId}/return`, { notes });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.stateSubmissions] }),
  });
};

// ── Legacy aliases used by StateUsersPage ─────────────────────────────────────
// These are thin wrappers keeping the old hook names alive during migration.

export const useUsersSummary = () =>
  useQuery({ queryKey: [STATE_QUERY_KEYS.users, 'summary'], queryFn: () => getUsers({ limit: 100 }), staleTime: 60_000 });

export const useLGACoordinator = (lgaId) =>
  useQuery({
    queryKey: ['state-coordinator', lgaId],
    queryFn:  () => getUsers({ lgaId, role: 'coordinator' }),
    enabled:  !!lgaId,
    staleTime: 30_000,
  });

export const useWardSecretary = (wardId) =>
  useQuery({
    queryKey: ['state-secretary', wardId],
    queryFn:  () => getUsers({ wardId, role: 'secretary' }),
    enabled:  !!wardId,
    staleTime: 30_000,
  });

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }) => reassignUser(userId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.users] }),
  });
};

export const useChangeUserPassword = () =>
  useMutation({ mutationFn: () => Promise.resolve() }); // PIN reset is done via set-credentials flow

export const useToggleUserAccess = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }) =>
      data?.is_active === false ? suspendUser(userId) : reactivateUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.users] }),
  });
};

export const useAssignUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => createUser(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [STATE_QUERY_KEYS.users] }),
  });
};
