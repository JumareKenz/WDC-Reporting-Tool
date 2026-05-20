/**
 * Date and Time Formatting Utilities
 */

/**
 * Format a date string to a readable format
 * @param {string|Date} date - Date to format
 * @param {boolean} includeTime - Whether to include time
 * @returns {string} Formatted date string
 */
export const formatDate = (date, includeTime = false) => {
  if (!date) return '-';

  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();

  if (includeTime) {
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${month} ${day}, ${year} ${hours}:${minutes} ${ampm}`;
  }

  return `${month} ${day}, ${year}`;
};

/**
 * Format a month string (YYYY-MM) to readable format
 * @param {string} monthStr - Month string in YYYY-MM format
 * @returns {string} Formatted month string
 */
export const formatMonth = (monthStr) => {
  if (!monthStr) return '-';

  const [year, month] = monthStr.split('-');
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];

  const monthIndex = parseInt(month, 10) - 1;
  if (monthIndex < 0 || monthIndex > 11) return monthStr;

  return `${months[monthIndex]} ${year}`;
};

/**
 * Get current month in YYYY-MM format
 * @returns {string} Current month
 */
export const getCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
};

/**
 * Get relative time string (e.g., "2 hours ago")
 * @param {string|Date} date - Date to compare
 * @returns {string} Relative time string
 */
export const getRelativeTime = (date) => {
  if (!date) return '-';

  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';

  const now = new Date();
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  if (diffWeek < 4) return `${diffWeek} week${diffWeek > 1 ? 's' : ''} ago`;
  if (diffMonth < 12) return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`;
  return `${diffYear} year${diffYear > 1 ? 's' : ''} ago`;
};

/**
 * Number Formatting Utilities
 */

/**
 * Format a number with thousand separators
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('en-US');
};

/**
 * Format a percentage
 * @param {number} num - Number to format as percentage
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage
 */
export const formatPercentage = (num, decimals = 1) => {
  if (num === null || num === undefined) return '0%';
  return `${num.toFixed(decimals)}%`;
};

/**
 * Format file size in bytes to readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Format duration in seconds to readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "2:30")
 */
export const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return '0:00';

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * String Formatting Utilities
 */

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Capitalize first letter of each word
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Convert underscore/dash separated string to title case
 * @param {string} str - String to convert
 * @returns {string} Title case string
 */
export const toTitleCase = (str) => {
  if (!str) return '';
  return str
    .replace(/[_-]/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Phone Number Formatting
 */

/**
 * Format Nigerian phone number
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '-';

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Format as: 0801 234 5678
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }

  // Format as: +234 801 234 5678
  if (cleaned.length === 13 && cleaned.startsWith('234')) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }

  return phone;
};

/**
 * Validation Helpers
 */

/**
 * Check if a month string is in the future
 * @param {string} monthStr - Month string in YYYY-MM format
 * @returns {boolean} True if month is in the future
 */
export const isMonthInFuture = (monthStr) => {
  if (!monthStr) return false;

  const [year, month] = monthStr.split('-').map(Number);
  const inputDate = new Date(year, month - 1);
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth());

  return inputDate > currentMonth;
};

/**
 * Check if a month string is valid
 * @param {string} monthStr - Month string in YYYY-MM format
 * @returns {boolean} True if valid
 */
export const isValidMonth = (monthStr) => {
  if (!monthStr) return false;

  const regex = /^\d{4}-\d{2}$/;
  if (!regex.test(monthStr)) return false;

  const [year, month] = monthStr.split('-').map(Number);
  return year >= 2020 && year <= 2100 && month >= 1 && month <= 12;
};

/**
 * Status Badge Helpers
 */

/**
 * Get color class for report status
 * @param {string} status - Report status
 * @returns {string} Tailwind color class
 */
export const getStatusColor = (status) => {
  const colors = {
    DRAFT: 'bg-neutral-100 text-neutral-800',
    SUBMITTED: 'bg-blue-100 text-blue-800',
    REVIEWED: 'bg-green-100 text-green-800',
    FLAGGED: 'bg-yellow-100 text-yellow-800',
  };
  return colors[status] || 'bg-neutral-100 text-neutral-800';
};

/**
 * Get color class for submission rate
 * @param {number} rate - Submission rate percentage
 * @returns {string} Tailwind color class
 */
export const getSubmissionRateColor = (rate) => {
  if (rate >= 90) return 'text-green-600';
  if (rate >= 70) return 'text-blue-600';
  if (rate >= 50) return 'text-yellow-600';
  return 'text-red-600';
};

/**
 * Get color class for priority
 * @param {string} priority - Priority level
 * @returns {string} Tailwind color class
 */
export const getPriorityColor = (priority) => {
  const colors = {
    LOW: 'bg-neutral-100 text-neutral-800',
    MEDIUM: 'bg-blue-100 text-blue-800',
    HIGH: 'bg-yellow-100 text-yellow-800',
    URGENT: 'bg-red-100 text-red-800',
  };
  return colors[priority] || 'bg-neutral-100 text-neutral-800';
};
