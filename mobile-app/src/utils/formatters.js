import { format, parseISO } from 'date-fns';

/**
 * Format a date string or Date object
 */
export const formatDate = (dateString, includeTime = false) => {
  if (!dateString) return '';

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return includeTime
      ? format(date, 'MMM dd, yyyy h:mm a')
      : format(date, 'MMM dd, yyyy');
  } catch (error) {
    return dateString;
  }
};

/**
 * Format month string (YYYY-MM) to display format
 */
export const formatMonth = (monthString) => {
  if (!monthString) return '';

  try {
    const date = parseISO(`${monthString}-01`);
    return format(date, 'MMMM yyyy');
  } catch (error) {
    return monthString;
  }
};

/**
 * Get current month in YYYY-MM format
 */
export const getCurrentMonth = () => {
  return format(new Date(), 'yyyy-MM');
};

/**
 * Get status badge color
 */
export const getStatusColor = (status) => {
  const colors = {
    DRAFT: '#94a3b8',
    SUBMITTED: '#3b82f6',
    REVIEWED: '#22c55e',
    FLAGGED: '#f59e0b',
  };
  return colors[status] || '#94a3b8';
};

/**
 * Get status text color
 */
export const getStatusTextColor = (status) => {
  const colors = {
    DRAFT: '#64748b',
    SUBMITTED: '#1e40af',
    REVIEWED: '#15803d',
    FLAGGED: '#b45309',
  };
  return colors[status] || '#64748b';
};

/**
 * Get status background color
 */
export const getStatusBgColor = (status) => {
  const colors = {
    DRAFT: '#f1f5f9',
    SUBMITTED: '#dbeafe',
    REVIEWED: '#dcfce7',
    FLAGGED: '#fef3c7',
  };
  return colors[status] || '#f1f5f9';
};

/**
 * Format percentage
 */
export const formatPercentage = (value, decimals = 0) => {
  return `${Number(value).toFixed(decimals)}%`;
};

/**
 * Format number with commas
 */
export const formatNumber = (value) => {
  return Number(value).toLocaleString();
};

/**
 * Truncate text with ellipsis
 */
export const truncate = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};
