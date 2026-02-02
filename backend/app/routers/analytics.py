from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime
from dateutil.relativedelta import relativedelta
from collections import Counter
from ..database import get_db
from ..models import User, LGA, Ward, Report
from ..schemas import (
    AnalyticsOverviewResponse, LGAComparisonItem, TrendItem,
    AIReportRequest, AIReportResponse, LGAHighlight
)
from ..dependencies import get_state_official

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview", response_model=dict)
def get_analytics_overview(
    month: Optional[str] = None,
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db)
):
    """Get state-wide overview statistics (State Official only)."""

    # Use current month if not provided
    if not month:
        now = datetime.now()
        month = f"{now.year}-{now.month:02d}"

    # Get totals
    total_lgas = db.query(LGA).count()
    total_wards = db.query(Ward).count()

    # Get reports for the month
    reports_submitted = db.query(Report).filter(Report.report_month == month).count()
    reports_missing = total_wards - reports_submitted

    submission_rate = (reports_submitted / total_wards * 100) if total_wards > 0 else 0

    # Get total meetings and attendees
    stats = db.query(
        func.sum(Report.meetings_held).label('total_meetings'),
        func.sum(Report.attendees_count).label('total_attendees')
    ).filter(Report.report_month == month).first()

    total_meetings = stats.total_meetings or 0
    total_attendees = stats.total_attendees or 0

    # Get top and low performing LGAs
    lgas = db.query(LGA).all()
    lga_performance = []

    for lga in lgas:
        wards_count = db.query(Ward).filter(Ward.lga_id == lga.id).count()
        reports_count = db.query(Report).join(Ward).filter(
            Ward.lga_id == lga.id,
            Report.report_month == month
        ).count()

        rate = (reports_count / wards_count * 100) if wards_count > 0 else 0

        lga_performance.append({
            "lga_id": lga.id,
            "lga_name": lga.name,
            "submission_rate": round(rate, 2),
            "wards_submitted": reports_count,
            "total_wards": wards_count
        })

    # Sort by submission rate
    lga_performance.sort(key=lambda x: x["submission_rate"], reverse=True)

    top_performing = lga_performance[:5]
    low_performing = [lga for lga in lga_performance if lga["submission_rate"] < 60][-5:]

    return {
        "success": True,
        "data": {
            "month": month,
            "state_summary": {
                "total_lgas": total_lgas,
                "total_wards": total_wards,
                "reports_submitted": reports_submitted,
                "reports_missing": reports_missing,
                "submission_rate": round(submission_rate, 2),
                "total_meetings_held": total_meetings,
                "total_attendees": total_attendees
            },
            "top_performing_lgas": top_performing,
            "low_performing_lgas": low_performing
        }
    }


@router.get("/lga-comparison", response_model=dict)
def get_lga_comparison(
    month: Optional[str] = None,
    sort_by: str = "submission_rate",
    order: str = "desc",
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db)
):
    """Compare all LGAs for a given month (State Official only)."""

    # Use current month if not provided
    if not month:
        now = datetime.now()
        month = f"{now.year}-{now.month:02d}"

    lgas = db.query(LGA).all()
    comparison_data = []

    for lga in lgas:
        wards = db.query(Ward).filter(Ward.lga_id == lga.id).all()
        total_wards = len(wards)

        reports = db.query(Report).join(Ward).filter(
            Ward.lga_id == lga.id,
            Report.report_month == month
        ).all()

        reports_submitted = len(reports)
        reports_missing = total_wards - reports_submitted
        submission_rate = (reports_submitted / total_wards * 100) if total_wards > 0 else 0

        total_meetings = sum(r.meetings_held for r in reports)
        total_attendees = sum(r.attendees_count for r in reports)

        comparison_data.append({
            "lga_id": lga.id,
            "lga_name": lga.name,
            "total_wards": total_wards,
            "reports_submitted": reports_submitted,
            "reports_missing": reports_missing,
            "submission_rate": round(submission_rate, 2),
            "total_meetings": total_meetings,
            "total_attendees": total_attendees
        })

    # Sort data
    reverse = (order == "desc")
    comparison_data.sort(key=lambda x: x.get(sort_by, 0), reverse=reverse)

    return {
        "success": True,
        "data": {
            "month": month,
            "lgas": comparison_data
        }
    }


@router.get("/trends", response_model=dict)
def get_submission_trends(
    start_month: Optional[str] = None,
    end_month: Optional[str] = None,
    months: Optional[int] = 6,
    lga_id: Optional[int] = None,
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db)
):
    """Get submission trends over time (State Official only).

    Either provide start_month and end_month, or provide months to get last N months.
    """

    # Generate month list
    from datetime import datetime
    from dateutil.relativedelta import relativedelta

    # If months parameter is provided, calculate start and end
    if not start_month or not end_month:
        end = datetime.utcnow()
        start = end - relativedelta(months=months - 1)
        start_month = start.strftime("%Y-%m")
        end_month = end.strftime("%Y-%m")

    start = datetime.strptime(start_month, "%Y-%m")
    end = datetime.strptime(end_month, "%Y-%m")

    months = []
    current = start
    while current <= end:
        months.append(current.strftime("%Y-%m"))
        current += relativedelta(months=1)

    trends = []
    for month in months:
        if lga_id:
            total_wards = db.query(Ward).filter(Ward.lga_id == lga_id).count()
            reports_submitted = db.query(Report).join(Ward).filter(
                Ward.lga_id == lga_id,
                Report.report_month == month
            ).count()
        else:
            total_wards = db.query(Ward).count()
            reports_submitted = db.query(Report).filter(Report.report_month == month).count()

        submission_rate = (reports_submitted / total_wards * 100) if total_wards > 0 else 0

        trends.append({
            "month": month,
            "total_wards": total_wards,
            "reports_submitted": reports_submitted,
            "submission_rate": round(submission_rate, 2)
        })

    return {
        "success": True,
        "data": {
            "period": {
                "start": start_month,
                "end": end_month
            },
            "trends": trends
        }
    }


@router.post("/ai-report", response_model=dict)
def generate_ai_report(
    request_data: AIReportRequest,
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db)
):
    """Generate AI-assisted summary report (State Official only)."""

    month = request_data.month

    # Get overall stats
    total_wards = db.query(Ward).count()
    reports_submitted = db.query(Report).filter(Report.report_month == month).count()
    submission_rate = (reports_submitted / total_wards * 100) if total_wards > 0 else 0

    # Get all reports for analysis
    reports = db.query(Report).filter(Report.report_month == month).all()

    # Analyze common issues
    all_issues = []
    all_challenges = []
    for report in reports:
        if report.issues_identified:
            all_issues.append(report.issues_identified.lower())
        if report.challenges:
            all_challenges.append(report.challenges.lower())

    # Extract common keywords (simple word frequency)
    issue_keywords = []
    for issues in all_issues:
        words = issues.split()
        issue_keywords.extend([w for w in words if len(w) > 4])

    common_issues = Counter(issue_keywords).most_common(5)

    # Build executive summary
    prev_month = datetime.strptime(month, "%Y-%m")
    prev_month = (prev_month.replace(day=1) - relativedelta(months=1)).strftime("%Y-%m")
    prev_reports = db.query(Report).filter(Report.report_month == prev_month).count()
    prev_rate = (prev_reports / total_wards * 100) if total_wards > 0 else 0
    rate_change = submission_rate - prev_rate

    executive_summary = f"""State-wide submission rate for {month} stands at {submission_rate:.2f}%, """
    if rate_change > 0:
        executive_summary += f"showing a {abs(rate_change):.2f}% improvement from {prev_month}. "
    elif rate_change < 0:
        executive_summary += f"showing a {abs(rate_change):.2f}% decline from {prev_month}. "
    else:
        executive_summary += f"remaining stable from {prev_month}. "

    if common_issues:
        top_issue = common_issues[0][0] if common_issues else "infrastructure"
        executive_summary += f"Key challenges identified include {top_issue} and related issues reported across multiple LGAs. "

    executive_summary += f"A total of {len(reports)} reports were submitted, documenting {sum(r.meetings_held for r in reports)} community meetings with {sum(r.attendees_count for r in reports)} total participants."

    # Key findings
    lgas_above_80 = 0
    lgas = db.query(LGA).all()
    for lga in lgas:
        wards_count = db.query(Ward).filter(Ward.lga_id == lga.id).count()
        reports_count = db.query(Report).join(Ward).filter(
            Ward.lga_id == lga.id,
            Report.report_month == month
        ).count()
        rate = (reports_count / wards_count * 100) if wards_count > 0 else 0
        if rate >= 80:
            lgas_above_80 += 1

    key_findings = [
        f"{lgas_above_80} LGAs achieved above 80% submission rate",
        f"{reports_submitted} out of {total_wards} wards submitted monthly reports",
        f"Average of {sum(r.meetings_held for r in reports) / len(reports):.1f} meetings per ward" if reports else "No reports submitted"
    ]

    if common_issues:
        key_findings.append(f"'{common_issues[0][0]}' mentioned frequently in issue reports")

    # Recommendations
    recommendations = [
        f"Focus intervention efforts on LGAs with submission rates below 60%",
        "Conduct capacity building for LGA coordinators in low-performing areas",
        "Increase community engagement initiatives to boost participation"
    ]

    if submission_rate < 75:
        recommendations.append("Implement reminder system to improve submission compliance")

    # LGA highlights
    lga_highlights = []
    lga_performance = []

    for lga in lgas:
        wards_count = db.query(Ward).filter(Ward.lga_id == lga.id).count()
        reports_count = db.query(Report).join(Ward).filter(
            Ward.lga_id == lga.id,
            Report.report_month == month
        ).count()
        rate = (reports_count / wards_count * 100) if wards_count > 0 else 0

        lga_performance.append({
            "name": lga.name,
            "rate": rate,
            "submitted": reports_count,
            "total": wards_count
        })

    lga_performance.sort(key=lambda x: x["rate"], reverse=True)

    # Top performer
    if lga_performance:
        top = lga_performance[0]
        lga_highlights.append({
            "lga_name": top["name"],
            "summary": f"Excellent performance with {top['rate']:.1f}% submission rate ({top['submitted']}/{top['total']} wards). Demonstrates strong coordinator engagement and effective ward mobilization.",
            "status": "EXCELLENT"
        })

    # Bottom performer
    if len(lga_performance) > 1:
        bottom = lga_performance[-1]
        if bottom["rate"] < 60:
            lga_highlights.append({
                "lga_name": bottom["name"],
                "summary": f"Requires urgent attention. Only {bottom['rate']:.1f}% submission rate ({bottom['submitted']}/{bottom['total']} wards). Recommend immediate coordinator review and support.",
                "status": "NEEDS_ATTENTION"
            })

    # Add a mid-performer
    if len(lga_performance) > 10:
        mid = lga_performance[len(lga_performance) // 2]
        lga_highlights.append({
            "lga_name": mid["name"],
            "summary": f"Moderate performance at {mid['rate']:.1f}% submission rate. Has potential for improvement with targeted interventions.",
            "status": "SATISFACTORY"
        })

    return {
        "success": True,
        "data": {
            "report": {
                "generated_at": datetime.utcnow(),
                "month": month,
                "executive_summary": executive_summary,
                "key_findings": key_findings,
                "recommendations": recommendations,
                "lga_highlights": lga_highlights
            }
        }
    }
