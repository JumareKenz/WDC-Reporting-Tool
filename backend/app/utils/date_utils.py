from datetime import datetime
from dateutil.relativedelta import relativedelta
from typing import Tuple, Dict


def get_target_report_month() -> str:
    """
    Determine the target report month based on the current date.

    Rules (Submission window: last week of month OR first week of next month):
    - Days 1-23: Report for previous month
    - Days 24-end of month: Report for current month

    Examples:
    - Feb 1-23: Submit January report
    - Feb 24-28: Submit February report
    - Mar 1-23: Submit February report
    - Mar 24-31: Submit March report

    Returns:
        str: Target report month in YYYY-MM format
    """
    now = datetime.utcnow()
    current_day = now.day

    if current_day <= 23:
        # Days 1-23 - report for previous month
        target_date = now - relativedelta(months=1)
    else:
        # Days 24-end - report for current month
        target_date = now

    return target_date.strftime('%Y-%m')


def get_month_display_info() -> Dict[str, any]:
    """
    Get comprehensive information about the current submission period.

    Returns:
        dict: {
            'target_month': str (YYYY-MM),
            'month_name': str (e.g., 'January 2024'),
            'is_submission_window': bool (true if in last week or first week),
            'current_day': int
        }
    """
    now = datetime.utcnow()
    current_day = now.day
    is_in_early_days = current_day <= 23
    is_submission_window = current_day <= 7 or current_day >= 24

    if is_in_early_days:
        target_date = now - relativedelta(months=1)
    else:
        target_date = now

    return {
        'target_month': target_date.strftime('%Y-%m'),
        'month_name': target_date.strftime('%B %Y'),
        'is_submission_window': is_submission_window,
        'current_day': current_day
    }


def validate_report_month(submitted_month: str) -> Tuple[bool, str]:
    """
    Validate that the submitted report month matches the expected month.

    Args:
        submitted_month: The month submitted in YYYY-MM format

    Returns:
        tuple: (is_valid: bool, error_message: str)
    """
    expected_month = get_target_report_month()

    if submitted_month != expected_month:
        info = get_month_display_info()
        current_day = info['current_day']

        if current_day <= 23:
            period_desc = f"During days 1-23, you must submit reports for the previous month ({info['month_name']})"
        else:
            period_desc = f"During days 24-end, you must submit reports for the current month ({info['month_name']})"

        error_msg = f"Invalid report month. {period_desc}. You submitted for {submitted_month}."
        return False, error_msg

    return True, ""


def format_month_display(month_str: str) -> str:
    """
    Format a YYYY-MM month string into a readable format.

    Args:
        month_str: Month in YYYY-MM format

    Returns:
        str: Formatted month (e.g., 'January 2024')
    """
    try:
        date_obj = datetime.strptime(month_str, '%Y-%m')
        return date_obj.strftime('%B %Y')
    except ValueError:
        return month_str
