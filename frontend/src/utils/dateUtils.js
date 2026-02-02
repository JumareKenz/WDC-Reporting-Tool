/**
 * Get the target report month based on the current date.
 *
 * Rules:
 * - Days 1-7: Report for previous month
 * - Days 8-31: Report for current month
 *
 * @returns {string} Target report month in YYYY-MM format
 */
export const getTargetReportMonth = () => {
  const now = new Date();
  const currentDay = now.getDate();

  let targetDate;
  if (currentDay <= 7) {
    // First week - report for previous month
    targetDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  } else {
    // After first week - report for current month
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
 *   is_first_week: boolean,
 *   current_day: number
 * }
 */
export const getSubmissionInfo = () => {
  const now = new Date();
  const currentDay = now.getDate();
  const isFirstWeek = currentDay <= 7;

  let targetDate;
  if (isFirstWeek) {
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
    is_first_week: isFirstWeek,
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

  if (info.is_first_week) {
    return `Days 1-7: Submit reports for previous month (${info.month_name})`;
  } else {
    return `Days 8-31: Submit reports for current month (${info.month_name})`;
  }
};
