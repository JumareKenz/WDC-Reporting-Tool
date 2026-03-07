import apiClient from './client';

export const fetchLgas = async () => {
  const response = await apiClient.get('/public/lgas');
  const data = response?.data || response;
  return Array.isArray(data) ? data : data?.lgas || [];
};

export const fetchWards = async (lgaId) => {
  const response = await apiClient.get('/public/wards', {
    params: { lga_id: lgaId },
  });
  const data = response?.data || response;
  return Array.isArray(data) ? data : data?.wards || [];
};

export const secretaryLogin = async (lgaId, wardId, pin) => {
  const response = await apiClient.post('/auth/secretary-login', {
    lga_id: lgaId,
    ward_id: wardId,
    pin,
  });
  return response?.data || response;
};
