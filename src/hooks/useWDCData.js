import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getReports,
  getReportById,
  createReport,
  setReportField,
  submitReport,
  editReturnedReport,
} from '../api/reports';
import { uploadAttachment, getReportAttachments } from '../api/attachments';
import { getDeliveries, markDeliveryRead } from '../api/messages';

export const WDC_QUERY_KEYS = {
  reports:       'wdc-reports',
  reportById:    (id)    => ['wdc-report', id],
  attachments:   (id)    => ['wdc-attachments', id],
  notifications: 'wdc-notifications',
};

export const useReports = (params = {}) =>
  useQuery({
    queryKey: [WDC_QUERY_KEYS.reports, params],
    queryFn:  () => getReports(params),
    staleTime: 60_000,
  });

export const useReportById = (reportId) =>
  useQuery({
    queryKey: WDC_QUERY_KEYS.reportById(reportId),
    queryFn:  () => getReportById(reportId),
    enabled:  !!reportId,
    staleTime: 60_000,
  });

/** Create a draft report (new flow: create → set fields → submit). */
export const useCreateReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WDC_QUERY_KEYS.reports] });
    },
  });
};

/** Set a single field on a draft report. */
export const useSetReportField = (reportId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => setReportField(reportId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WDC_QUERY_KEYS.reportById(reportId) });
    },
  });
};

/** Secretary submits a completed draft. */
export const useSubmitReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportId) => submitReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WDC_QUERY_KEYS.reports] });
    },
  });
};

/** Secretary re-opens a returned report for editing. */
export const useEditReturnedReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editReturnedReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WDC_QUERY_KEYS.reports] });
    },
  });
};

export const useReportAttachments = (reportId) =>
  useQuery({
    queryKey: WDC_QUERY_KEYS.attachments(reportId),
    queryFn:  () => getReportAttachments(reportId),
    enabled:  !!reportId,
  });

export const useUploadAttachment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, onProgress }) => uploadAttachment(data, onProgress),
    onSuccess: (_r, { data }) => {
      if (data.reportId) {
        queryClient.invalidateQueries({ queryKey: WDC_QUERY_KEYS.attachments(data.reportId) });
      }
    },
  });
};

export const useNotifications = (params = {}) =>
  useQuery({
    queryKey: [WDC_QUERY_KEYS.notifications, params],
    queryFn:  () => getDeliveries(params),
    staleTime: 30_000,
  });

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markDeliveryRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WDC_QUERY_KEYS.notifications] });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids) => {
      await Promise.all((ids || []).map(markDeliveryRead));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WDC_QUERY_KEYS.notifications] });
    },
  });
};
