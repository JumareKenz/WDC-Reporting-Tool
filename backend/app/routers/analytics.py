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
            "official_ward_count": lga.num_wards,
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


@router.get("/service-delivery", response_model=dict)
def get_service_delivery(
    month: Optional[str] = None,
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db)
):
    """Get aggregated service delivery data from Section 3 of all submitted reports."""

    if not month:
        now = datetime.now()
        month = f"{now.year}-{now.month:02d}"

    reports = db.query(Report).filter(Report.report_month == month).all()

    # Section 3A - Health Data
    health_data = {
        "opd_total": sum(r.health_opd_total or 0 for r in reports),
        "general_attendance": sum(r.health_general_attendance_total or 0 for r in reports),
        "routine_immunization": sum(r.health_routine_immunization_total or 0 for r in reports),
        "penta1": sum(r.health_penta1 or 0 for r in reports),
        "bcg": sum(r.health_bcg or 0 for r in reports),
        "penta3": sum(r.health_penta3 or 0 for r in reports),
        "measles": sum(r.health_measles or 0 for r in reports),
        "opd_under5": sum(r.health_opd_under5_total or 0 for r in reports),
        "malaria_under5": sum(r.health_malaria_under5 or 0 for r in reports),
        "diarrhea_under5": sum(r.health_diarrhea_under5 or 0 for r in reports),
        "anc_total": sum(r.health_anc_total or 0 for r in reports),
        "anc_first_visit": sum(r.health_anc_first_visit or 0 for r in reports),
        "anc_fourth_visit": sum(r.health_anc_fourth_visit or 0 for r in reports),
        "anc_eighth_visit": sum(r.health_anc_eighth_visit or 0 for r in reports),
        "deliveries": sum(r.health_deliveries or 0 for r in reports),
        "postnatal": sum(r.health_postnatal or 0 for r in reports),
        "fp_counselling": sum(r.health_fp_counselling or 0 for r in reports),
        "fp_new_acceptors": sum(r.health_fp_new_acceptors or 0 for r in reports),
        "hepb_tested": sum(r.health_hepb_tested or 0 for r in reports),
        "hepb_positive": sum(r.health_hepb_positive or 0 for r in reports),
        "tb_presumptive": sum(r.health_tb_presumptive or 0 for r in reports),
        "tb_on_treatment": sum(r.health_tb_on_treatment or 0 for r in reports),
    }

    # Section 3B - Facility Support
    facility_support = {
        "facilities_renovated": sum(r.facility_renovated_count or 0 for r in reports),
        "items_donated_wdc": sum(r.items_donated_count or 0 for r in reports),
        "items_donated_govt": sum(r.items_donated_govt_count or 0 for r in reports),
        "items_repaired": sum(r.items_repaired_count or 0 for r in reports),
    }

    # Section 3C - Transportation
    transportation = {
        "women_transported_anc": sum(r.women_transported_anc or 0 for r in reports),
        "women_transported_delivery": sum(r.women_transported_delivery or 0 for r in reports),
        "children_transported_danger": sum(r.children_transported_danger or 0 for r in reports),
        "women_supported_delivery_items": sum(r.women_supported_delivery_items or 0 for r in reports),
    }

    # Section 3D - CMPDSR
    cmpdsr = {
        "maternal_deaths": sum(r.maternal_deaths or 0 for r in reports),
        "perinatal_deaths": sum(r.perinatal_deaths or 0 for r in reports),
    }

    return {
        "success": True,
        "data": {
            "month": month,
            "reports_count": len(reports),
            "health_data": health_data,
            "facility_support": facility_support,
            "transportation": transportation,
            "cmpdsr": cmpdsr,
        }
    }


@router.post("/monthly-report", response_model=dict)
def generate_monthly_report(
    request_data: AIReportRequest,
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db)
):
    """Generate comprehensive monthly report with service delivery, charts, and SWOT analysis."""

    month = request_data.month

    # --- State Overview ---
    total_lgas = db.query(LGA).count()
    total_wards = db.query(Ward).count()
    reports = db.query(Report).filter(Report.report_month == month).all()
    reports_submitted = len(reports)
    submission_rate = (reports_submitted / total_wards * 100) if total_wards > 0 else 0

    # Previous month comparison
    prev_month_dt = datetime.strptime(month, "%Y-%m").replace(day=1) - relativedelta(months=1)
    prev_month = prev_month_dt.strftime("%Y-%m")
    prev_reports = db.query(Report).filter(Report.report_month == prev_month).count()
    prev_rate = (prev_reports / total_wards * 100) if total_wards > 0 else 0
    rate_change = round(submission_rate - prev_rate, 2)

    state_overview = {
        "total_lgas": total_lgas,
        "total_wards": total_wards,
        "reports_submitted": reports_submitted,
        "reports_missing": total_wards - reports_submitted,
        "submission_rate": round(submission_rate, 2),
        "prev_rate": round(prev_rate, 2),
        "rate_change": rate_change,
    }

    # --- Service Delivery Aggregations ---
    health_data = {
        "opd_total": sum(r.health_opd_total or 0 for r in reports),
        "general_attendance": sum(r.health_general_attendance_total or 0 for r in reports),
        "routine_immunization": sum(r.health_routine_immunization_total or 0 for r in reports),
        "penta1": sum(r.health_penta1 or 0 for r in reports),
        "bcg": sum(r.health_bcg or 0 for r in reports),
        "penta3": sum(r.health_penta3 or 0 for r in reports),
        "measles": sum(r.health_measles or 0 for r in reports),
        "anc_total": sum(r.health_anc_total or 0 for r in reports),
        "anc_first_visit": sum(r.health_anc_first_visit or 0 for r in reports),
        "anc_fourth_visit": sum(r.health_anc_fourth_visit or 0 for r in reports),
        "anc_eighth_visit": sum(r.health_anc_eighth_visit or 0 for r in reports),
        "deliveries": sum(r.health_deliveries or 0 for r in reports),
        "postnatal": sum(r.health_postnatal or 0 for r in reports),
        "fp_counselling": sum(r.health_fp_counselling or 0 for r in reports),
        "fp_new_acceptors": sum(r.health_fp_new_acceptors or 0 for r in reports),
        "hepb_tested": sum(r.health_hepb_tested or 0 for r in reports),
        "hepb_positive": sum(r.health_hepb_positive or 0 for r in reports),
        "tb_presumptive": sum(r.health_tb_presumptive or 0 for r in reports),
        "tb_on_treatment": sum(r.health_tb_on_treatment or 0 for r in reports),
    }

    facility_support = {
        "facilities_renovated": sum(r.facility_renovated_count or 0 for r in reports),
        "items_donated_wdc": sum(r.items_donated_count or 0 for r in reports),
        "items_donated_govt": sum(r.items_donated_govt_count or 0 for r in reports),
        "items_repaired": sum(r.items_repaired_count or 0 for r in reports),
    }

    transportation = {
        "women_transported_anc": sum(r.women_transported_anc or 0 for r in reports),
        "women_transported_delivery": sum(r.women_transported_delivery or 0 for r in reports),
        "children_transported_danger": sum(r.children_transported_danger or 0 for r in reports),
        "women_supported_delivery_items": sum(r.women_supported_delivery_items or 0 for r in reports),
    }

    cmpdsr = {
        "maternal_deaths": sum(r.maternal_deaths or 0 for r in reports),
        "perinatal_deaths": sum(r.perinatal_deaths or 0 for r in reports),
    }

    # --- Key Issues & Challenges (word frequency extraction) ---
    all_text = []
    all_recommendations = []
    stop_words = {"the", "and", "for", "that", "this", "with", "from", "have", "been", "were", "are", "was", "not", "but", "they", "their", "there", "some", "which", "when", "what", "about", "also", "into", "more", "other", "than", "then", "very", "will", "would", "could", "should", "being"}

    for report in reports:
        if report.issues_identified:
            all_text.append(report.issues_identified)
        if report.challenges:
            all_text.append(report.challenges)
        if report.recommendations:
            all_recommendations.append(report.recommendations)

    # Extract top issue phrases
    issue_words = []
    for text in all_text:
        words = text.lower().split()
        issue_words.extend([w.strip(".,;:!?()") for w in words if len(w) > 4 and w.lower() not in stop_words])

    top_issues = [{"word": w, "count": c} for w, c in Counter(issue_words).most_common(10)]

    # Deduplicate recommendations
    unique_recs = list(set(r.strip() for r in all_recommendations if r.strip()))[:10]

    # --- Chart Data ---
    # Immunization breakdown
    immunization_chart = [
        {"name": "BCG", "value": health_data["bcg"]},
        {"name": "Penta 1", "value": health_data["penta1"]},
        {"name": "Penta 3", "value": health_data["penta3"]},
        {"name": "Measles", "value": health_data["measles"]},
        {"name": "Routine Total", "value": health_data["routine_immunization"]},
    ]

    # ANC cascade
    anc_chart = [
        {"name": "ANC Total", "value": health_data["anc_total"]},
        {"name": "1st Visit", "value": health_data["anc_first_visit"]},
        {"name": "4th Visit", "value": health_data["anc_fourth_visit"]},
        {"name": "8th Visit", "value": health_data["anc_eighth_visit"]},
        {"name": "Deliveries", "value": health_data["deliveries"]},
        {"name": "Postnatal", "value": health_data["postnatal"]},
    ]

    # Transportation breakdown
    transportation_chart = [
        {"name": "ANC Transport", "value": transportation["women_transported_anc"]},
        {"name": "Delivery Transport", "value": transportation["women_transported_delivery"]},
        {"name": "Children Emergency", "value": transportation["children_transported_danger"]},
        {"name": "Delivery Items", "value": transportation["women_supported_delivery_items"]},
    ]

    # Facility support
    facility_chart = [
        {"name": "Renovated", "value": facility_support["facilities_renovated"]},
        {"name": "WDC Donations", "value": facility_support["items_donated_wdc"]},
        {"name": "Govt Donations", "value": facility_support["items_donated_govt"]},
        {"name": "Items Repaired", "value": facility_support["items_repaired"]},
    ]

    # LGA performance chart
    lgas = db.query(LGA).all()
    lga_rates = []
    for lga in lgas:
        wards_count = db.query(Ward).filter(Ward.lga_id == lga.id).count()
        reports_count = db.query(Report).join(Ward).filter(
            Ward.lga_id == lga.id,
            Report.report_month == month
        ).count()
        rate = (reports_count / wards_count * 100) if wards_count > 0 else 0
        lga_rates.append({
            "name": lga.name,
            "rate": round(rate, 1),
            "submitted": reports_count,
            "total": wards_count,
        })
    lga_rates.sort(key=lambda x: x["rate"], reverse=True)

    # --- SWOT Analysis (algorithmic, based on data thresholds) ---
    strengths = []
    weaknesses = []
    opportunities = []
    threats = []

    if submission_rate >= 80:
        strengths.append(f"High submission rate of {submission_rate:.1f}% demonstrates strong compliance")
    if submission_rate >= 60:
        strengths.append(f"{len([l for l in lga_rates if l['rate'] >= 80])} LGAs achieving 80%+ submission rates")
    total_transported = transportation["women_transported_anc"] + transportation["women_transported_delivery"]
    if total_transported > 0:
        strengths.append(f"{total_transported} women transported for ANC/delivery services")
    total_immunization = health_data["routine_immunization"]
    if total_immunization > 0:
        strengths.append(f"{total_immunization} routine immunizations administered")

    if submission_rate < 70:
        weaknesses.append(f"Submission rate of {submission_rate:.1f}% is below target of 80%")
    low_lgas = [l for l in lga_rates if l["rate"] < 50]
    if low_lgas:
        weaknesses.append(f"{len(low_lgas)} LGAs with critically low submission rates (<50%)")
    if cmpdsr["maternal_deaths"] > 0:
        weaknesses.append(f"{cmpdsr['maternal_deaths']} maternal deaths reported - requires urgent intervention")
    if facility_support["facilities_renovated"] == 0:
        weaknesses.append("No facility renovations reported this month")

    improving_lgas = [l for l in lga_rates if l["rate"] >= 50 and l["rate"] < 80]
    if improving_lgas:
        opportunities.append(f"{len(improving_lgas)} LGAs in the 50-80% range with potential for improvement")
    if health_data["fp_counselling"] > 0:
        opportunities.append(f"Family planning outreach active with {health_data['fp_counselling']} counselling sessions")
    if rate_change > 0:
        opportunities.append(f"Positive trend: {rate_change:.1f}% improvement from previous month")
    opportunities.append("Strengthen community engagement through WDC meetings to improve data quality")

    if cmpdsr["maternal_deaths"] + cmpdsr["perinatal_deaths"] > 5:
        threats.append(f"High mortality: {cmpdsr['maternal_deaths']} maternal + {cmpdsr['perinatal_deaths']} perinatal deaths")
    if rate_change < -5:
        threats.append(f"Declining submission rate: {abs(rate_change):.1f}% drop from previous month")
    non_submitting = len([l for l in lga_rates if l["rate"] == 0])
    if non_submitting > 0:
        threats.append(f"{non_submitting} LGAs with zero submissions - risk of complete disengagement")
    if len(top_issues) > 0:
        threats.append(f"Recurring issues: '{top_issues[0]['word']}' reported {top_issues[0]['count']} times across wards")

    # Ensure each category has at least one entry
    if not strengths:
        strengths.append("Active WDC reporting system in place across all LGAs")
    if not weaknesses:
        weaknesses.append("Data quality validation could be strengthened")
    if not threats:
        threats.append("Sustaining momentum requires continued support and resources")

    swot = {
        "strengths": strengths,
        "weaknesses": weaknesses,
        "opportunities": opportunities,
        "threats": threats,
    }

    return {
        "success": True,
        "data": {
            "month": month,
            "generated_at": datetime.utcnow().isoformat(),
            "state_overview": state_overview,
            "service_delivery": {
                "health_data": health_data,
                "facility_support": facility_support,
                "transportation": transportation,
                "cmpdsr": cmpdsr,
            },
            "key_issues": top_issues,
            "recommendations": unique_recs,
            "charts": {
                "immunization": immunization_chart,
                "anc_cascade": anc_chart,
                "transportation": transportation_chart,
                "facility_support": facility_chart,
                "lga_rates": lga_rates,
            },
            "swot": swot,
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
