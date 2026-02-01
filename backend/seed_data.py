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
import sqlite3
import json
from app.database import SessionLocal, engine
from app.models import Base, LGA, Ward, User, Report, VoiceNote, Notification, Feedback, InvestigationNote, FormDefinition
from app.auth import get_password_hash

# ---------------------------------------------------------------------------
# Migration: add custom_fields column to reports if missing, create form_definitions table
# ---------------------------------------------------------------------------
def _run_migrations():
    from app.config import DATABASE_URL
    # Extract file path from sqlite:///path
    db_path = str(DATABASE_URL).replace("sqlite:///", "")
    if not db_path or db_path == "":
        return
    import os
    if not os.path.exists(db_path):
        return  # tables will be created by create_all below
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    # custom_fields on reports
    cursor.execute("PRAGMA table_info(reports)")
    existing = [col[1] for col in cursor.fetchall()]
    if "custom_fields" not in existing:
        cursor.execute("ALTER TABLE reports ADD COLUMN custom_fields TEXT")
        print("Migration: added custom_fields to reports")
    conn.commit()
    conn.close()

# Create all tables
Base.metadata.create_all(bind=engine)

# Run migrations for columns that create_all won't add to existing tables
_run_migrations()

db = SessionLocal()


def clear_database():
    """Clear all existing data."""
    print("Clearing existing data...")
    db.query(InvestigationNote).delete()
    db.query(Feedback).delete()
    db.query(Notification).delete()
    db.query(VoiceNote).delete()
    db.query(Report).delete()
    db.query(FormDefinition).delete()
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
    """Seed sample wards for each LGA with real Kaduna State ward names."""
    print("Seeding wards...")

    # Real ward names for Kaduna LGAs
    lga_wards_map = {
        "Chikun": ["Barnawa", "Chikaji", "Chikun", "Gwagwada", "Kakau", "Kuriga", "Kujama", "Narayi", "Nasarawa", "Rido", "Sabon Tasha", "Unguwan Sarki"],
        "Kaduna North": ["Badiko", "Doka", "Gawuna", "Hayin Banki", "Kamazou", "Kawo", "Kazaure", "Magajin Gari", "Unguwan Dosa", "Unguwan Rimi", "Unguwan Shanu"],
        "Kaduna South": ["Barnawa", "Badawa", "Kakuri", "Makera", "Tudun Nupawa", "Television", "Tudun Wada", "Sabon Gari North", "Sabon Gari South", "Sabon Gari East", "Sabon Gari West", "Sabon Gari Central", "Gamagira", "Tudun Wazara", "Afaka"],
        "Igabi": ["Afaka", "Birnin Yero", "Danmagaji", "Gabasawa", "Gadan Gayan", "Rigachikun", "Rigasa", "Romi", "Shika", "Turunku", "Yakawada", "Zabi", "Igabi"],
        "Zaria": ["Bomo", "Dambo", "Dutsen Abba", "Fudawa", "Garu", "Gyallesu", "Jushi", "Kaura", "Kufena", "Likoro", "Samaru", "Tukur Tukur", "Wucicciri"],
        "Giwa": ["Galadimawa", "Gangara", "Dantudu", "Danmahawayi", "Galadima", "Giwa", "Kakangi", "Kazage", "Kidandan", "Shika", "Yakawada"],
        "Sabon Gari": ["Basawa", "Chikaji", "Dogarawa", "Hanwa", "Sabon Gari East", "Sabon Gari West", "Samaru", "Tudun Wada East", "Tudun Wada West", "Unguwan Gabas", "Unguwan Liman", "Zabi", "Gyallesu", "Unguwan Mu'azu"],
    }

    wards = []

    for lga in lgas:
        # Get real ward names if available, otherwise generate generic ones
        if lga.name in lga_wards_map:
            ward_names = lga_wards_map[lga.name]
        else:
            # Generic ward names for LGAs without specific data
            ward_names = [
                f"{lga.name} Central", f"{lga.name} North", f"{lga.name} South",
                f"{lga.name} East", f"{lga.name} West", "Sabon Gari", "Tudun Wada",
                "Nasarawa", "Kawo", "Makera", "Rigasa"
            ]

        # Create wards up to the LGA's num_wards
        for i in range(min(lga.num_wards, len(ward_names))):
            ward_name = ward_names[i]
            ward = Ward(
                lga_id=lga.id,
                name=ward_name,
                code=f"{lga.code}-{ward_name[:3].upper()}",
                population=12000 + (i * 3000)  # Realistic population range
            )
            db.add(ward)
            wards.append(ward)

        # If LGA has more wards than we have names, generate additional ones
        if lga.num_wards > len(ward_names):
            for i in range(len(ward_names), lga.num_wards):
                ward_name = f"{lga.name} Ward {i + 1}"
                ward = Ward(
                    lga_id=lga.id,
                    name=ward_name,
                    code=f"{lga.code}-W{i + 1}",
                    population=12000 + (i * 3000)
                )
                db.add(ward)
                wards.append(ward)

    db.commit()
    print(f"Created {len(wards)} wards")
    return wards


def seed_users(lgas, wards):
    """Seed demo users with realistic Nigerian names."""
    print("Seeding users...")

    users = []
    password = "demo123"
    hashed_password = get_password_hash(password)

    # Create State Officials with realistic names
    state_officials = [
        {
            "email": "state.admin@kaduna.gov.ng",
            "full_name": "Dr. Fatima Abubakar Yusuf",
            "phone": "08033445566",
            "role": "STATE_OFFICIAL"
        },
        {
            "email": "state.analyst@kaduna.gov.ng",
            "full_name": "Engr. Musa Ibrahim Aliyu",
            "phone": "08044556677",
            "role": "STATE_OFFICIAL"
        },
        {
            "email": "state.monitor@kaduna.gov.ng",
            "full_name": "Mrs. Grace Aondona Ikya",
            "phone": "08055667788",
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

    # LGA Coordinator names (realistic)
    lga_coordinator_names = [
        "Abubakar Sani Mahmud", "Ibrahim Garba Danjuma", "Halima Yusuf Bello",
        "Samuel Ayuba Gani", "Zainab Mohammed Suleiman", "Patrick Eze Okoro",
        "Hauwa Aliyu Hassan", "Daniel Audu Danladi", "Amina Ahmad Bello",
        "Joseph Yohanna Kure", "Maryam Usman Shehu", "Emmanuel Nuhu Adamu",
        "Fatima Ibrahim Musa", "John Elisha Maigari", "Salamatu Garba Abubakar"
    ]

    # Create LGA Coordinators
    for idx, lga in enumerate(lgas[:15]):  # First 15 LGAs
        user = User(
            email=f"coord.{lga.code.lower()}@kaduna.gov.ng",
            password_hash=hashed_password,
            full_name=lga_coordinator_names[idx] if idx < len(lga_coordinator_names) else f"{lga.name} LGA Coordinator",
            phone=f"0809{lga.id:07d}",
            role="LGA_COORDINATOR",
            lga_id=lga.id,
            is_active=True
        )
        db.add(user)
        users.append(user)

    # WDC Secretary names (realistic Nigerian names)
    wdc_secretary_names = [
        "Amina Yusuf Ibrahim", "Blessing Chukwu Okoro", "Fatima Sani Ahmad",
        "Mary Joseph Elisha", "Hauwa Aliyu Bello", "Esther Daniel Yakubu",
        "Zainab Ibrahim Hassan", "Rejoice Peter John", "Aisha Mohammed Usman",
        "Grace Audu Samuel", "Halima Garba Suleiman", "Deborah Yohanna Ishaku",
        "Salamatu Usman Musa", "Patience Emmanuel Gideon", "Hadiza Bello Abdullahi",
        "Faith John Peter", "Safiya Ahmad Ibrahim", "Comfort Eze Chinedu",
        "Khadija Suleiman Aliyu", "Joy Daniel Moses", "Maryam Hassan Mohammed",
        "Hope Samuel David", "Rukayya Yusuf Abubakar", "Rachael Ayuba Stephen",
        "Asmau Danjuma Garba", "Mercy Elisha Sunday", "Rashida Ibrahim Sani",
        "Victoria Nuhu Paul", "Jamila Mahmud Ahmad", "Comfort Danladi Joseph",
        "Hassana Bello Ibrahim", "Florence Yohanna Emmanuel", "Zulaihat Usman Bala",
        "Lydia John Thomas", "Sadiya Garba Mohammed", "Miriam Audu Daniel",
        "Nana Aliyu Suleiman", "Priscilla Peter James", "Fatima Mohammed Sani",
        "Elizabeth Yakubu John", "Hadiza Yusuf Usman", "Helen Elisha Joshua",
        "Jamila Ahmad Bello", "Rose Daniel Isaac", "Maimuna Sani Garba",
        "Martha Yohanna Peter", "Aisha Ibrahim Aliyu", "Glory Emmanuel Moses",
        "Ramatu Usman Hassan", "Charity Nuhu David", "Khadija Bello Mohammed"
    ]

    # Create WDC Secretaries
    # Track email counts per LGA to ensure unique emails
    lga_email_counters = {}

    for idx, ward in enumerate(wards[:80]):  # Create for first 80 wards
        lga = next((l for l in lgas if l.id == ward.lga_id), None)

        # Generate unique email using LGA code + sequential number
        lga_code = lga.code.lower() if lga else 'ward'
        if lga_code not in lga_email_counters:
            lga_email_counters[lga_code] = 1
        else:
            lga_email_counters[lga_code] += 1

        email_number = lga_email_counters[lga_code]
        user = User(
            email=f"wdc.{lga_code}.{email_number}@kaduna.gov.ng",
            password_hash=hashed_password,
            full_name=wdc_secretary_names[idx % len(wdc_secretary_names)],
            phone=f"0801{ward.id:07d}",
            role="WDC_SECRETARY",
            ward_id=ward.id,
            is_active=True
        )
        db.add(user)
        users.append(user)

    db.commit()
    print(f"Created {len(users)} users")
    print(f"\nDemo Login Credentials (Password: {password}):")
    print(f"  State Official: state.admin@kaduna.gov.ng")
    print(f"  LGA Coordinator (Chikun): coord.chk@kaduna.gov.ng")
    print(f"  WDC Secretary (Chikun Ward 1): wdc.chk.1@kaduna.gov.ng")
    print(f"  WDC Secretary (Chikun Ward 2): wdc.chk.2@kaduna.gov.ng")
    print("  (Pattern: wdc.<lga_code>.<number>@kaduna.gov.ng)")
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


def seed_form_definition(users):
    """Seed the initial Monthly WDC Report form definition."""
    print("Seeding form definition...")

    state_officials = [u for u in users if u.role == "STATE_OFFICIAL"]
    created_by = state_officials[0].id if state_officials else None

    sec1, sec2, sec3, sec4 = "sec_agenda", "sec_action_tracker", "sec_health", "sec_community"
    sec5, sec6, sec7, sec8 = "sec_vdc", "sec_mobilization", "sec_action_plan", "sec_support"

    sections = [
        {"id": sec1, "title": "Agenda & Governance", "description": "Meeting type, date, and agenda items covered", "order": 1},
        {"id": sec2, "title": "Action Tracker", "description": "Track progress on previous action points", "order": 2},
        {"id": sec3, "title": "Health System", "description": "Health data across all indicator categories", "order": 3},
        {"id": sec4, "title": "Community Involvement", "description": "Town hall and community feedback", "order": 4},
        {"id": sec5, "title": "VDC Reports", "description": "Village Development Committee reports", "order": 5},
        {"id": sec6, "title": "Community Mobilization", "description": "Awareness and leader engagement activities", "order": 6},
        {"id": sec7, "title": "Action Plan", "description": "Planned actions with timelines", "order": 7},
        {"id": sec8, "title": "Support & Conclusion", "description": "Support needs, attendance, and signatures", "order": 8},
    ]

    def simple_field(fld_id, section_id, name, label, ftype, order, **kwargs):
        return {
            "id": fld_id, "section_id": section_id, "name": name, "label": label,
            "type": ftype, "order": order,
            "placeholder": kwargs.get("placeholder", ""),
            "help_text": kwargs.get("help_text", ""),
            "required": kwargs.get("required", False),
            "options": kwargs.get("options"),
            "table_columns": kwargs.get("table_columns"),
            "default_rows": kwargs.get("default_rows"),
            "voice_enabled": kwargs.get("voice_enabled", False),
            "logic": kwargs.get("logic"),
        }

    fields = []

    # --- Section 1: Agenda & Governance ---
    fields.append(simple_field("fld_meeting_type", sec1, "meeting_type", "Meeting Type", "select", 1,
        placeholder="Select meeting type", required=True,
        options=[{"value": "Monthly", "label": "Monthly"}, {"value": "Emergency", "label": "Emergency"}, {"value": "Quarterly Town Hall", "label": "Quarterly Town Hall"}]))
    fields.append(simple_field("fld_report_date", sec1, "report_date", "Report Date", "date", 2,
        help_text="Date the meeting was held", required=True))
    fields.append(simple_field("fld_report_time", sec1, "report_time", "Report Time", "time", 3,
        help_text="Time the meeting started"))

    agenda_items = [
        ("fld_agenda_prayer", "agenda_opening_prayer", "Opening Prayer"),
        ("fld_agenda_minutes", "agenda_minutes", "Minutes of Last Meeting"),
        ("fld_agenda_tracker", "agenda_action_tracker", "Action Tracker Review"),
        ("fld_agenda_reports", "agenda_reports", "Reports"),
        ("fld_agenda_plan", "agenda_action_plan", "Action Plan"),
        ("fld_agenda_aob", "agenda_aob", "Any Other Business"),
        ("fld_agenda_closing", "agenda_closing", "Closing Prayer"),
    ]
    for i, (fld_id, name, label) in enumerate(agenda_items, 4):
        fields.append(simple_field(fld_id, sec1, name, label, "checkbox", i))

    # --- Section 2: Action Tracker ---
    fields.append(simple_field("fld_action_tracker", sec2, "action_tracker", "Action Tracker", "table", 1,
        help_text="Track progress on previous action points",
        table_columns=[
            {"name": "action_point", "label": "Action Point", "type": "text", "placeholder": "Describe the action point", "options": None},
            {"name": "status", "label": "Status", "type": "select", "placeholder": "", "options": [{"value": "Pending", "label": "Pending"}, {"value": "In Progress", "label": "In Progress"}, {"value": "Completed", "label": "Completed"}, {"value": "Cancelled", "label": "Cancelled"}]},
            {"name": "challenges", "label": "Challenges", "type": "text", "placeholder": "Any challenges faced", "options": None},
            {"name": "timeline", "label": "Timeline", "type": "text", "placeholder": "Expected completion date", "options": None},
            {"name": "responsible_person", "label": "Responsible Person", "type": "text", "placeholder": "Name of person responsible", "options": None},
        ]))

    # --- Section 3: Health System ---
    health_fields = [
        ("fld_h_penta1", "health_penta1", "Penta 1 (Immunization)"),
        ("fld_h_bcg", "health_bcg", "BCG (Immunization)"),
        ("fld_h_penta3", "health_penta3", "Penta 3 (Immunization)"),
        ("fld_h_measles", "health_measles", "Measles (Immunization)"),
        ("fld_h_malaria_u5", "health_malaria_under5", "Malaria (Under 5)"),
        ("fld_h_diarrhea_u5", "health_diarrhea_under5", "Diarrhea (Under 5)"),
        ("fld_h_anc1", "health_anc_first_visit", "ANC 1st Visit"),
        ("fld_h_anc4", "health_anc_fourth_visit", "ANC 4th Visit"),
        ("fld_h_anc8", "health_anc_eighth_visit", "ANC 8th Visit"),
        ("fld_h_deliveries", "health_deliveries", "Deliveries"),
        ("fld_h_postnatal", "health_postnatal", "Postnatal Care"),
        ("fld_h_fp_counsel", "health_fp_counselling", "FP Counselling"),
        ("fld_h_fp_new", "health_fp_new_acceptors", "FP New Acceptors"),
        ("fld_h_hepb_tested", "health_hepb_tested", "Hepatitis B Tested"),
        ("fld_h_hepb_pos", "health_hepb_positive", "Hepatitis B Positive"),
        ("fld_h_tb_presump", "health_tb_presumptive", "TB Presumptive"),
        ("fld_h_tb_treat", "health_tb_on_treatment", "TB On Treatment"),
        ("fld_h_fac_govt", "facilities_renovated_govt", "Facilities Renovated (Govt)"),
        ("fld_h_fac_partners", "facilities_renovated_partners", "Facilities Renovated (Partners)"),
        ("fld_h_fac_wdc", "facilities_renovated_wdc", "Facilities Renovated (WDC)"),
        ("fld_h_items_donated", "items_donated_count", "Items Donated (Count)"),
        ("fld_h_items_repaired", "items_repaired_count", "Items Repaired (Count)"),
        ("fld_h_transport_anc", "women_transported_anc", "Women Transported (ANC)"),
        ("fld_h_transport_del", "women_transported_delivery", "Women Transported (Delivery)"),
        ("fld_h_transport_child", "children_transported_danger", "Children Transported (Danger)"),
        ("fld_h_transport_items", "women_supported_delivery_items", "Women Supported (Delivery Items)"),
        ("fld_h_maternal_deaths", "maternal_deaths", "Maternal Deaths"),
        ("fld_h_perinatal_deaths", "perinatal_deaths", "Perinatal Deaths"),
    ]
    for i, (fld_id, name, label) in enumerate(health_fields, 1):
        fields.append(simple_field(fld_id, sec3, name, label, "number", i, placeholder="0"))

    # --- Section 4: Community Involvement ---
    fields.append(simple_field("fld_town_hall", sec4, "town_hall_conducted", "Town Hall Conducted?", "select", 1,
        help_text="Was a town hall meeting conducted this month?",
        options=[{"value": "Yes", "label": "Yes"}, {"value": "No", "label": "No"}, {"value": "Partial", "label": "Partial"}]))

    # community_feedback table — logic: show only when town_hall_conducted equals Yes
    cf_indicators = [
        {"value": "Health Services", "label": "Health Services"},
        {"value": "Education", "label": "Education"},
        {"value": "Water & Sanitation", "label": "Water & Sanitation"},
        {"value": "Roads & Infrastructure", "label": "Roads & Infrastructure"},
        {"value": "Security", "label": "Security"},
    ]
    fields.append(simple_field("fld_community_feedback", sec4, "community_feedback", "Community Feedback", "table", 2,
        help_text="Record feedback from community members at the town hall",
        table_columns=[
            {"name": "indicator", "label": "Indicator", "type": "select", "placeholder": "", "options": cf_indicators + [{"value": "Agriculture", "label": "Agriculture"}, {"value": "Other", "label": "Other"}]},
            {"name": "feedback", "label": "Feedback", "type": "textarea", "placeholder": "Community feedback on this indicator", "options": None},
            {"name": "action_required", "label": "Action Required", "type": "text", "placeholder": "What action is needed?", "options": None},
        ],
        default_rows=[
            {"indicator": "Health Services", "feedback": "", "action_required": ""},
            {"indicator": "Education", "feedback": "", "action_required": ""},
            {"indicator": "Water & Sanitation", "feedback": "", "action_required": ""},
            {"indicator": "Roads & Infrastructure", "feedback": "", "action_required": ""},
            {"indicator": "Security", "feedback": "", "action_required": ""},
        ],
        logic={
            "action": "show",
            "condition_group": {
                "operator": "AND",
                "rules": [{"type": "condition", "field_id": "fld_town_hall", "operator": "equals", "value": "Yes"}]
            }
        }
    ))

    # --- Section 5: VDC Reports ---
    fields.append(simple_field("fld_vdc_reports", sec5, "vdc_reports", "VDC Reports", "table", 1,
        help_text="Reports from Village Development Committees",
        table_columns=[
            {"name": "vdc_name", "label": "VDC Name", "type": "text", "placeholder": "Name of the VDC", "options": None},
            {"name": "issues", "label": "Issues", "type": "textarea", "placeholder": "Issues raised by the VDC", "options": None},
            {"name": "action_taken", "label": "Action Taken", "type": "text", "placeholder": "Actions taken in response", "options": None},
        ]))

    # --- Section 6: Community Mobilization ---
    fields.append(simple_field("fld_awareness_theme", sec6, "awareness_theme", "Awareness Theme", "textarea", 1,
        placeholder="Describe the awareness theme", help_text="What awareness campaign was conducted?", voice_enabled=True))
    fields.append(simple_field("fld_trad_leaders", sec6, "traditional_leaders_support", "Traditional Leaders Support", "textarea", 2,
        placeholder="Describe support from traditional leaders", help_text="Level of engagement with traditional leaders", voice_enabled=True))
    fields.append(simple_field("fld_religious_leaders", sec6, "religious_leaders_support", "Religious Leaders Support", "textarea", 3,
        placeholder="Describe support from religious leaders", help_text="Level of engagement with religious leaders", voice_enabled=True))

    # --- Section 7: Action Plan ---
    fields.append(simple_field("fld_action_plan", sec7, "action_plan", "Action Plan", "table", 1,
        help_text="Planned actions for the coming period",
        table_columns=[
            {"name": "issue", "label": "Issue", "type": "text", "placeholder": "Issue to be addressed", "options": None},
            {"name": "action", "label": "Action", "type": "text", "placeholder": "Planned action", "options": None},
            {"name": "timeline", "label": "Timeline", "type": "text", "placeholder": "Expected completion date", "options": None},
            {"name": "responsible_person", "label": "Responsible Person", "type": "text", "placeholder": "Person responsible", "options": None},
        ]))

    # --- Section 8: Support & Conclusion ---
    fields.append(simple_field("fld_support_required", sec8, "support_required", "Support Required", "textarea", 1,
        placeholder="Describe support needed from LGA/State", help_text="What support does the ward need?", voice_enabled=True))
    fields.append(simple_field("fld_aob", sec8, "aob", "Any Other Business", "textarea", 2,
        placeholder="Any other business discussed", help_text="Additional matters raised during the meeting", voice_enabled=True))
    fields.append(simple_field("fld_att_total", sec8, "attendance_total", "Total Attendance", "number", 3, placeholder="0"))
    fields.append(simple_field("fld_att_male", sec8, "attendance_male", "Male Attendance", "number", 4, placeholder="0"))
    fields.append(simple_field("fld_att_female", sec8, "attendance_female", "Female Attendance", "number", 5, placeholder="0"))
    fields.append(simple_field("fld_next_meeting", sec8, "next_meeting_date", "Next Meeting Date", "date", 6,
        help_text="When is the next meeting scheduled?"))
    fields.append(simple_field("fld_chairman_sig", sec8, "chairman_signature", "Chairman Signature", "text", 7,
        placeholder="Full name of WDC Chairman"))
    fields.append(simple_field("fld_secretary_sig", sec8, "secretary_signature", "Secretary Signature", "text", 8,
        placeholder="Full name of WDC Secretary"))

    definition = json.dumps({"sections": sections, "fields": fields})

    form = FormDefinition(
        name="Monthly WDC Report",
        description="Comprehensive monthly report for Ward Development Committees covering health data, community feedback, and action planning",
        definition=definition,
        status="DEPLOYED",
        version=1,
        created_by=created_by,
        deployed_at=datetime.now(),
    )
    db.add(form)
    db.commit()
    print(f"Created Monthly WDC Report form definition (DEPLOYED, {len(fields)} fields across {len(sections)} sections)")


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
        seed_form_definition(users)

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
