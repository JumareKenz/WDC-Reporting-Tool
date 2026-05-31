import apiClient, { buildQueryString } from './client';
import { API_ENDPOINTS } from '../utils/constants';

// Helper: coerce an unknown response to a plain array
const toArray = (r) => (Array.isArray(r) ? r : r?.users || r?.data || []);

// Users API — backend routes: /users (RLS-scoped GETs; director-only writes)

export const listUsers = async (params = {}) =>
  apiClient.get(`${API_ENDPOINTS.USERS}${buildQueryString(params)}`);

export const getUserById = async (userId) =>
  apiClient.get(API_ENDPOINTS.USER_BY_ID(userId));

export const createUser = async (data) =>
  apiClient.post(API_ENDPOINTS.USERS, data);

export const reassignUser = async (userId, data) =>
  apiClient.patch(API_ENDPOINTS.USER_ASSIGNMENT(userId), data);

export const suspendUser = async (userId, data = {}) =>
  apiClient.post(API_ENDPOINTS.USER_SUSPEND(userId), data);

export const reactivateUser = async (userId, data = {}) =>
  apiClient.post(API_ENDPOINTS.USER_REACTIVATE(userId), data);

export const deleteUser = async (userId) =>
  apiClient.delete(API_ENDPOINTS.USER_BY_ID(userId));

// PIN / password changes route through /auth/set-credentials for the calling user.
export const setOwnCredentials = async (data) =>
  apiClient.post(API_ENDPOINTS.SET_CREDENTIALS, data);

// ---------------------------------------------------------------------------
// Legacy shims — keep old callsites compiling. Each maps to the closest backend
// equivalent or returns a graceful default for unsupported endpoints.
// ---------------------------------------------------------------------------

export const getUsersSummary = async () => {
  const [usersRaw, lgasRaw] = await Promise.all([
    listUsers(),
    apiClient.get(API_ENDPOINTS.LGAS),
  ]);
  const list = toArray(usersRaw);
  const lgas = Array.isArray(lgasRaw) ? lgasRaw : lgasRaw?.lgas || [];

  const roleMatch = (u, ...roles) =>
    roles.some((r) => u.role === r || u.role?.toLowerCase() === r.toLowerCase());

  const coordinators = list.filter((u) => roleMatch(u, 'LGA_COORDINATOR', 'coordinator'));
  const secretaries  = list.filter((u) => roleMatch(u, 'WDC_SECRETARY', 'secretary'));
  const activeCoors  = coordinators.filter((u) => u.is_active !== false);
  const activeSecs   = secretaries.filter((u)  => u.is_active !== false);

  // total_wards: sum lga.num_wards / wardCount / ward_count if present on LGA objects
  const totalWards = lgas.reduce(
    (s, l) => s + (l.num_wards ?? l.wardCount ?? l.ward_count ?? 0), 0
  ) || null;

  return {
    total_lgas:           lgas.length || null,
    total_wards:          totalWards,
    total_coordinators:   coordinators.length,
    total_secretaries:    secretaries.length,
    active_coordinators:  activeCoors.length,
    active_secretaries:   activeSecs.length,
    unassigned_lgas:      Math.max(0, lgas.length - coordinators.length),
    unassigned_wards:     totalWards != null ? Math.max(0, totalWards - secretaries.length) : null,
  };
};

// Wards for an LGA come from the geography endpoint, not the users list
export const getLGAWards = async (lgaId) => {
  const res = await apiClient.get(API_ENDPOINTS.LGA_WARDS(lgaId));
  return Array.isArray(res) ? res : res?.wards || res?.data?.wards || [];
};

export const getLGACoordinator = async (lgaId) => {
  const result = await listUsers({ lgaId, role: 'coordinator' });
  const list = Array.isArray(result) ? result : result?.users || [];
  return list[0] || null;
};

export const getWardSecretary = async (wardId) => {
  const result = await listUsers({ wardId, role: 'secretary' });
  const list = Array.isArray(result) ? result : result?.users || [];
  return list[0] || null;
};

export const updateUser = async (userId, data) => {
  // Closest analogue is reassignment; other user-profile patches aren't exposed.
  if (data?.lgaId || data?.wardId) return reassignUser(userId, data);
  return getUserById(userId);
};

export const changeUserPassword = async (_userId, data) => setOwnCredentials(data);
export const changeUserPin = async (_userId, data) => setOwnCredentials(data);

export const toggleUserAccess = async (userId, data) =>
  data?.suspended ? suspendUser(userId, data) : reactivateUser(userId, data);

export const assignUser = async (data) => {
  if (!data?.userId) throw new Error('userId is required to assign a user');
  return reassignUser(data.userId, data);
};
