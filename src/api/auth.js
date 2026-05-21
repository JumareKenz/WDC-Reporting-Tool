import apiClient from './client';

export const fetchLgas = async () => {
  const response = await apiClient.get('/lgas');
  const data = response?.data || response;
  return Array.isArray(data) ? data : data?.lgas || [];
};

export const fetchWards = async (lgaId) => {
  const response = await apiClient.get(`/lgas/${lgaId}/wards`);
  const data = response?.data || response;
  return Array.isArray(data) ? data : data?.wards || [];
};

export const secretaryLogin = async (lgaId, wardId, pin) => {
  const deviceId = localStorage.getItem('wdc_device_id') || crypto.randomUUID();
  localStorage.setItem('wdc_device_id', deviceId);

  const response = await apiClient.post('/auth/sign-in/mobile', {
    lgaId,
    wardId,
    pin,
    deviceId,
  });
  return response?.data || response;
};
