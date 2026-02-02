/**
 * Get the target report month based on the current date.
 *
 * Rules (Submission window: last week of month OR first week of next month):
 * - Days 1-23: Report for previous month
 * - Days 24-end of month: Report for current month
 *
 * Examples:
 * - Feb 1-23: Submit January report
 * - Feb 24-28: Submit February report
 * - Mar 1-23: Submit February report
 * - Mar 24-31: Submit March report
 *
 * @returns {string} Target report month in YYYY-MM format
 */
export const getTargetReportMonth = () => {
  const now = new Date();
  const currentDay = now.getDate();

  let targetDate;
  if (currentDay <= 23) {
    // Days 1-23 - report for previous month
    targetDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  } else {
    // Days 24-end - report for current month
    targetDate = now;
  }

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}`;
};

/**
 * Get comprehensive information about the current submission period.
 *
 * @returns {Object} {
 *   target_month: string (YYYY-MM),
 *   month_name: string (e.g., 'January 2024'),
 *   is_submission_window: boolean (true if in last week or first week),
 *   current_day: number
 * }
 */
export const getSubmissionInfo = () => {
  const now = new Date();
  const currentDay = now.getDate();
  const isInEarlyDays = currentDay <= 23;
  const isInSubmissionWindow = currentDay <= 7 || currentDay >= 24;

  let targetDate;
  if (isInEarlyDays) {
    targetDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  } else {
    targetDate = now;
  }

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const monthName = targetDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return {
    target_month: `${year}-${month}`,
    month_name: monthName,
    is_submission_window: isInSubmissionWindow,
    current_day: currentDay,
  };
};

/**
 * Format a YYYY-MM month string into a readable format.
 *
 * @param {string} monthStr - Month in YYYY-MM format
 * @returns {string} Formatted month (e.g., 'January 2024')
 */
export const formatMonthDisplay = (monthStr) => {
  try {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  } catch (error) {
    return monthStr;
  }
};

/**
 * Get a description of the current submission period.
 *
 * @returns {string} Description of submission period
 */
export const getSubmissionPeriodDescription = () => {
  const info = getSubmissionInfo();
  const currentDay = info.current_day;

  if (currentDay <= 23) {
    return `Days 1-23: Submit reports for previous month (${info.month_name})`;
  } else {
    return `Days 24-end: Submit reports for current month (${info.month_name})`;
  }
};
