import apiClient from './client';
import { API_ENDPOINTS } from '../utils/constants';

export const getUsersSummary = async () => {
  return await apiClient.get(API_ENDPOINTS.USERS_SUMMARY);
};

export const getLGAWards = async (lgaId) => {
  return await apiClient.get(API_ENDPOINTS.USER_LGA_WARDS(lgaId));
};

export const getLGACoordinator = async (lgaId) => {
  return await apiClient.get(API_ENDPOINTS.USER_COORDINATOR(lgaId));
};

export const getWardSecretary = async (wardId) => {
  return await apiClient.get(API_ENDPOINTS.USER_SECRETARY(wardId));
};

export const updateUser = async (userId, data) => {
  return await apiClient.patch(API_ENDPOINTS.USER_BY_ID(userId), data);
};

export const changeUserPassword = async (userId, data) => {
  return await apiClient.patch(API_ENDPOINTS.USER_PASSWORD(userId), data);
};

export const toggleUserAccess = async (userId, data) => {
  return await apiClient.patch(API_ENDPOINTS.USER_ACCESS(userId), data);
};

export const assignUser = async (data) => {
  return await apiClient.post(API_ENDPOINTS.USER_ASSIGN, data);
};
