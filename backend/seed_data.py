"""
Seed database with demo data for Kaduna State WDC Digital Reporting System.

Run this script to populate the database with:
- All 23 Kaduna LGAs
- Sample wards for each LGA
- Demo users (WDC Secretaries, LGA Coordinators, State Officials)
- Sample reports
- Sample notifications and feedback
"""

import sys
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from datetime import datetime, timedelta
from app.database import SessionLocal, engine
from app.models import Base, LGA, Ward, User, Report, VoiceNote, Notification, Feedback, InvestigationNote
from app.auth import get_password_hash

# Create all tables
Base.metadata.create_all(bind=engine)

db = SessionLocal()


def clear_database():
    """Clear all existing data."""
    print("Clearing existing data...")
    db.query(InvestigationNote).delete()
    db.query(Feedback).delete()
    db.query(Notification).delete()
    db.query(VoiceNote).delete()
    db.query(Report).delete()
    db.query(User).delete()
    db.query(Ward).delete()
    db.query(LGA).delete()
    db.commit()
    print("Database cleared.")


def seed_lgas():
    """Seed all 23 Kaduna LGAs."""
    print("Seeding LGAs...")

    lgas_data = [
        {"name": "Birnin Gwari", "code": "BGW", "population": 214000, "num_wards": 10},
        {"name": "Chikun", "code": "CHK", "population": 372000, "num_wards": 12},
        {"name": "Giwa", "code": "GIW", "population": 290000, "num_wards": 11},
        {"name": "Igabi", "code": "IGB", "population": 482000, "num_wards": 13},
        {"name": "Ikara", "code": "IKR", "population": 265000, "num_wards": 10},
        {"name": "Jaba", "code": "JBA", "population": 182000, "num_wards": 10},
        {"name": "Jema'a", "code": "JMA", "population": 264000, "num_wards": 11},
        {"name": "Kachia", "code": "KCH", "population": 185000, "num_wards": 11},
        {"name": "Kaduna North", "code": "KDN", "population": 364000, "num_wards": 11},
        {"name": "Kaduna South", "code": "KDS", "population": 402000, "num_wards": 15},
        {"name": "Kagarko", "code": "KGK", "population": 152000, "num_wards": 10},
        {"name": "Kajuru", "code": "KJR", "population": 144000, "num_wards": 10},
        {"name": "Kaura", "code": "KRA", "population": 203000, "num_wards": 10},
        {"name": "Kauru", "code": "KRU", "population": 195000, "num_wards": 10},
        {"name": "Kubau", "code": "KBU", "population": 278000, "num_wards": 11},
        {"name": "Kudan", "code": "KDN2", "population": 185000, "num_wards": 11},
        {"name": "Lere", "code": "LRE", "population": 331000, "num_wards": 13},
        {"name": "Makarfi", "code": "MKF", "population": 157000, "num_wards": 11},
        {"name": "Sabon Gari", "code": "SBG", "population": 312000, "num_wards": 14},
        {"name": "Sanga", "code": "SNG", "population": 148000, "num_wards": 11},
        {"name": "Soba", "code": "SOB", "population": 196000, "num_wards": 11},
        {"name": "Zangon Kataf", "code": "ZKT", "population": 307000, "num_wards": 10},
        {"name": "Zaria", "code": "ZAR", "population": 408000, "num_wards": 13},
    ]

    lgas = []
    for lga_data in lgas_data:
        lga = LGA(**lga_data)
        db.add(lga)
        lgas.append(lga)

    db.commit()
    print(f"Created {len(lgas)} LGAs")
    return lgas


def seed_wards(lgas):
    """Seed sample wards for each LGA."""
    print("Seeding wards...")

    # Sample ward names (generic, will be customized per LGA)
    ward_templates = [
        "Central", "North", "South", "East", "West",
        "Sabon Gari", "Tudun Wada", "Barnawa", "Unguwan Rimi", "Nasarawa",
        "Kawo", "Malali", "Makera", "Limanchin", "Rigasa"
    ]

    wards = []
    ward_counter = 1

    for lga in lgas:
        # Create wards for this LGA
        for i in range(min(lga.num_wards, len(ward_templates))):
            ward_name = ward_templates[i] if i < len(ward_templates) else f"Ward {i + 1}"
            ward = Ward(
                lga_id=lga.id,
                name=ward_name,
                code=f"{lga.code}-{ward_name[:3].upper()}",
                population=15000 + (i * 2000)
            )
            db.add(ward)
            wards.append(ward)
            ward_counter += 1

    db.commit()
    print(f"Created {len(wards)} wards")
    return wards


def seed_users(lgas, wards):
    """Seed demo users."""
    print("Seeding users...")

    users = []
    password = "demo123"
    hashed_password = get_password_hash(password)

    # Create State Officials
    state_officials = [
        {
            "email": "state.admin@kaduna.gov.ng",
            "full_name": "Dr. Fatima Abdullahi",
            "phone": "08055555555",
            "role": "STATE_OFFICIAL"
        },
        {
            "email": "state.analyst@kaduna.gov.ng",
            "full_name": "Musa Ibrahim Danjuma",
            "phone": "08055555556",
            "role": "STATE_OFFICIAL"
        }
    ]

    for user_data in state_officials:
        user = User(
            **user_data,
            password_hash=hashed_password,
            is_active=True
        )
        db.add(user)
        users.append(user)

    # Create LGA Coordinators (one per LGA)
    for lga in lgas[:10]:  # First 10 LGAs for demo
        user = User(
            email=f"coord.{lga.code.lower()}@kaduna.gov.ng",
            password_hash=hashed_password,
            full_name=f"{lga.name} LGA Coordinator",
            phone=f"0809{lga.id:07d}",
            role="LGA_COORDINATOR",
            lga_id=lga.id,
            is_active=True
        )
        db.add(user)
        users.append(user)

    # Create WDC Secretaries (one per ward for first 50 wards)
    for ward in wards[:50]:
        lga = next((l for l in lgas if l.id == ward.lga_id), None)
        user = User(
            email=f"wdc.{ward.code.lower().replace('-', '.')}@kaduna.gov.ng",
            password_hash=hashed_password,
            full_name=f"{ward.name} WDC Secretary",
            phone=f"0801{ward.id:07d}",
            role="WDC_SECRETARY",
            ward_id=ward.id,
            is_active=True
        )
        db.add(user)
        users.append(user)

    db.commit()
    print(f"Created {len(users)} users")
    print(f"\nDemo Login Credentials:")
    print(f"  State Official: state.admin@kaduna.gov.ng / {password}")
    print(f"  LGA Coordinator: coord.chk@kaduna.gov.ng / {password}")
    print(f"  WDC Secretary: wdc.chk.cen@kaduna.gov.ng / {password}")
    return users


def seed_reports(wards, users):
    """Seed sample reports."""
    print("Seeding reports...")

    reports = []
    wdc_secretaries = [u for u in users if u.role == "WDC_SECRETARY"]

    # Generate reports for last 3 months
    months = []
    for i in range(3):
        date = datetime.now() - timedelta(days=30 * i)
        months.append(f"{date.year}-{date.month:02d}")

    issues_samples = [
        "Poor road conditions affecting community access",
        "Water shortage in the northern section",
        "Need for additional street lighting",
        "Drainage system requires maintenance",
        "Youth unemployment concerns raised",
        "Market facilities need renovation",
        "Health center requires medical supplies",
        "School building needs repairs",
        "Erosion control measures needed",
        "Waste management challenges"
    ]

    actions_samples = [
        "Reported issue to LGA council",
        "Organized community meeting to discuss solutions",
        "Submitted formal request for intervention",
        "Coordinated with local leaders",
        "Engaged with relevant government agency",
        "Mobilized community volunteers",
        "Conducted site inspection",
        "Documented evidence and submitted report"
    ]

    challenges_samples = [
        "Limited budget allocation",
        "Delayed response from authorities",
        "Community members' varying opinions",
        "Lack of technical expertise",
        "Insufficient resources",
        "Weather conditions affecting implementation",
        "Coordination challenges with stakeholders"
    ]

    recommendations_samples = [
        "Increase quarterly budget for community projects",
        "Establish direct communication channel with LGA",
        "Conduct regular community engagement sessions",
        "Provide capacity building for committee members",
        "Improve reporting and tracking systems",
        "Foster partnerships with NGOs and private sector"
    ]

    import random

    for secretary in wdc_secretaries[:30]:  # Create reports for first 30 secretaries
        for month_idx, month in enumerate(months):
            # Not all wards submit every month (realistic scenario)
            if random.random() < 0.85:  # 85% submission rate
                report = Report(
                    ward_id=secretary.ward_id,
                    user_id=secretary.id,
                    report_month=month,
                    meetings_held=random.randint(1, 5),
                    attendees_count=random.randint(30, 200),
                    issues_identified=random.choice(issues_samples),
                    actions_taken=random.choice(actions_samples),
                    challenges=random.choice(challenges_samples) if random.random() < 0.7 else None,
                    recommendations=random.choice(recommendations_samples) if random.random() < 0.6 else None,
                    additional_notes="Community engagement was positive and productive.",
                    status="REVIEWED" if month_idx > 0 else "SUBMITTED"
                )
                db.add(report)
                reports.append(report)

    db.commit()
    print(f"Created {len(reports)} reports")
    return reports


def seed_notifications(users, reports):
    """Seed sample notifications."""
    print("Seeding notifications...")

    notifications = []
    wdc_secretaries = [u for u in users if u.role == "WDC_SECRETARY"][:10]
    lga_coordinators = [u for u in users if u.role == "LGA_COORDINATOR"]

    # Create notifications for missing reports
    for secretary in wdc_secretaries[:5]:
        notif = Notification(
            recipient_id=secretary.id,
            sender_id=None,
            notification_type="REPORT_MISSING",
            title="Report Submission Reminder",
            message=f"Your ward has not submitted the current month's report. Please submit before the deadline.",
            is_read=False
        )
        db.add(notif)
        notifications.append(notif)

    # Create notifications for submitted reports
    for coordinator in lga_coordinators[:3]:
        notif = Notification(
            recipient_id=coordinator.id,
            sender_id=None,
            notification_type="REPORT_SUBMITTED",
            title="New Reports Submitted",
            message=f"Multiple wards in your LGA have submitted their monthly reports.",
            is_read=False
        )
        db.add(notif)
        notifications.append(notif)

    db.commit()
    print(f"Created {len(notifications)} notifications")
    return notifications


def seed_feedback(users, wards):
    """Seed sample feedback messages."""
    print("Seeding feedback...")

    feedback_messages = []
    wdc_secretaries = [u for u in users if u.role == "WDC_SECRETARY"][:5]
    lga_coordinators = [u for u in users if u.role == "LGA_COORDINATOR"]

    for secretary in wdc_secretaries:
        # Find coordinator for this secretary's LGA
        ward = next((w for w in wards if w.id == secretary.ward_id), None)
        if ward:
            coordinator = next((c for c in lga_coordinators if c.lga_id == ward.lga_id), None)
            if coordinator:
                # Coordinator to Secretary
                feedback = Feedback(
                    ward_id=secretary.ward_id,
                    sender_id=coordinator.id,
                    recipient_id=secretary.id,
                    message="Great work on your last report! Please provide more details on the timeline for the proposed interventions.",
                    is_read=True
                )
                db.add(feedback)
                feedback_messages.append(feedback)

                # Secretary reply
                feedback2 = Feedback(
                    ward_id=secretary.ward_id,
                    sender_id=secretary.id,
                    recipient_id=coordinator.id,
                    message="Thank you! The LGA has promised to commence the project by end of next month. I will monitor progress closely.",
                    is_read=False,
                    parent_id=None  # Will be updated after first message is saved
                )
                db.add(feedback2)
                feedback_messages.append(feedback2)

    db.commit()
    print(f"Created {len(feedback_messages)} feedback messages")
    return feedback_messages


def seed_investigations(users, lgas):
    """Seed sample investigation notes."""
    print("Seeding investigation notes...")

    investigations = []
    state_officials = [u for u in users if u.role == "STATE_OFFICIAL"]

    if state_officials:
        state_official = state_officials[0]

        # Investigation 1: Low submission in an LGA
        inv1 = InvestigationNote(
            created_by=state_official.id,
            title="Low Submission Rate in Zaria LGA",
            description="Only 6 out of 13 wards submitted reports for the current month. Need to investigate coordinator effectiveness and identify barriers to submission.",
            investigation_type="PERFORMANCE",
            priority="HIGH",
            status="OPEN",
            lga_id=lgas[22].id if len(lgas) > 22 else lgas[0].id  # Zaria
        )
        db.add(inv1)
        investigations.append(inv1)

        # Investigation 2: Budget concerns
        inv2 = InvestigationNote(
            created_by=state_official.id,
            title="Recurring Budget Concerns in Chikun LGA",
            description="Multiple wards in Chikun LGA have reported budget constraints affecting community programs. Requires review of budget allocation process.",
            investigation_type="FINANCIAL",
            priority="MEDIUM",
            status="IN_PROGRESS",
            lga_id=lgas[1].id  # Chikun
        )
        db.add(inv2)
        investigations.append(inv2)

        # Investigation 3: Compliance issue
        inv3 = InvestigationNote(
            created_by=state_official.id,
            title="Report Quality Issues",
            description="Several reports lack sufficient detail and actionable recommendations. Need to organize training for WDC secretaries on report writing.",
            investigation_type="COMPLIANCE",
            priority="MEDIUM",
            status="OPEN",
            lga_id=None
        )
        db.add(inv3)
        investigations.append(inv3)

    db.commit()
    print(f"Created {len(investigations)} investigation notes")
    return investigations


def main():
    """Main seeding function."""
    print("\n" + "=" * 60)
    print("KADUNA STATE WDC DIGITAL REPORTING SYSTEM")
    print("Database Seeding Script")
    print("=" * 60 + "\n")

    try:
        # Clear existing data
        clear_database()

        # Seed data
        lgas = seed_lgas()
        wards = seed_wards(lgas)
        users = seed_users(lgas, wards)
        reports = seed_reports(wards, users)
        notifications = seed_notifications(users, reports)
        feedback_messages = seed_feedback(users, wards)
        investigations = seed_investigations(users, lgas)

        print("\n" + "=" * 60)
        print("SEEDING COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print(f"\nSummary:")
        print(f"  - {len(lgas)} LGAs")
        print(f"  - {len(wards)} Wards")
        print(f"  - {len(users)} Users")
        print(f"  - {len(reports)} Reports")
        print(f"  - {len(notifications)} Notifications")
        print(f"  - {len(feedback_messages)} Feedback Messages")
        print(f"  - {len(investigations)} Investigation Notes")
        print("\nYou can now start the backend server:")
        print("  uvicorn app.main:app --reload")
        print("\nAPI Documentation will be available at:")
        print("  http://localhost:8000/docs")
        print("\n")

    except Exception as e:
        print(f"\nError during seeding: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
