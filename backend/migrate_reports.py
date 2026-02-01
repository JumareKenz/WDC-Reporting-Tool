"""
Migration script to update Report table with comprehensive health data fields.

This script adds new columns to the reports table to support the comprehensive
WDC monthly report form required by Kaduna State Government.
"""

import sqlite3
import os

# Path to the database
DB_PATH = os.path.join(os.path.dirname(__file__), 'wdc.db')

def migrate():
    """Add new columns to reports table."""
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # New columns to add
    new_columns = [
        # Meeting metadata
        ("report_date", "TEXT"),
        ("report_time", "TEXT"),
        ("meeting_type", "TEXT DEFAULT 'Monthly'"),
        ("agenda_opening_prayer", "BOOLEAN DEFAULT 0"),
        ("agenda_minutes", "BOOLEAN DEFAULT 0"),
        ("agenda_action_tracker", "BOOLEAN DEFAULT 0"),
        ("agenda_reports", "BOOLEAN DEFAULT 0"),
        ("agenda_action_plan", "BOOLEAN DEFAULT 0"),
        ("agenda_aob", "BOOLEAN DEFAULT 0"),
        ("agenda_closing", "BOOLEAN DEFAULT 0"),
        
        # Action Tracker (JSON)
        ("action_tracker", "TEXT"),
        
        # Health Data - OPD
        ("health_penta1", "INTEGER DEFAULT 0"),
        ("health_bcg", "INTEGER DEFAULT 0"),
        ("health_penta3", "INTEGER DEFAULT 0"),
        ("health_measles", "INTEGER DEFAULT 0"),
        
        # Health Data - OPD Under 5
        ("health_malaria_under5", "INTEGER DEFAULT 0"),
        ("health_diarrhea_under5", "INTEGER DEFAULT 0"),
        
        # Health Data - ANC
        ("health_anc_first_visit", "INTEGER DEFAULT 0"),
        ("health_anc_fourth_visit", "INTEGER DEFAULT 0"),
        ("health_anc_eighth_visit", "INTEGER DEFAULT 0"),
        ("health_deliveries", "INTEGER DEFAULT 0"),
        ("health_postnatal", "INTEGER DEFAULT 0"),
        
        # Health Data - Family Planning
        ("health_fp_counselling", "INTEGER DEFAULT 0"),
        ("health_fp_new_acceptors", "INTEGER DEFAULT 0"),
        
        # Health Data - Hepatitis B
        ("health_hepb_tested", "INTEGER DEFAULT 0"),
        ("health_hepb_positive", "INTEGER DEFAULT 0"),
        
        # Health Data - TB
        ("health_tb_presumptive", "INTEGER DEFAULT 0"),
        ("health_tb_on_treatment", "INTEGER DEFAULT 0"),
        
        # Health Facility Support
        ("facilities_renovated_govt", "INTEGER DEFAULT 0"),
        ("facilities_renovated_partners", "INTEGER DEFAULT 0"),
        ("facilities_renovated_wdc", "INTEGER DEFAULT 0"),
        ("items_donated_count", "INTEGER DEFAULT 0"),
        ("items_donated_types", "TEXT"),
        ("items_repaired_count", "INTEGER DEFAULT 0"),
        ("items_repaired_types", "TEXT"),
        
        # Transportation & Emergency
        ("women_transported_anc", "INTEGER DEFAULT 0"),
        ("women_transported_delivery", "INTEGER DEFAULT 0"),
        ("children_transported_danger", "INTEGER DEFAULT 0"),
        ("women_supported_delivery_items", "INTEGER DEFAULT 0"),
        
        # cMPDSR
        ("maternal_deaths", "INTEGER DEFAULT 0"),
        ("perinatal_deaths", "INTEGER DEFAULT 0"),
        ("maternal_death_causes", "TEXT"),
        ("perinatal_death_causes", "TEXT"),
        
        # Community Feedback
        ("town_hall_conducted", "TEXT"),
        ("community_feedback", "TEXT"),
        
        # VDC Reports
        ("vdc_reports", "TEXT"),
        
        # Community Mobilization
        ("awareness_theme", "TEXT"),
        ("traditional_leaders_support", "TEXT"),
        ("religious_leaders_support", "TEXT"),
        
        # Action Plan
        ("action_plan", "TEXT"),
        
        # Support & Conclusion
        ("support_required", "TEXT"),
        ("aob", "TEXT"),
        ("attendance_total", "INTEGER DEFAULT 0"),
        ("attendance_male", "INTEGER DEFAULT 0"),
        ("attendance_female", "INTEGER DEFAULT 0"),
        ("next_meeting_date", "TEXT"),
        ("chairman_signature", "TEXT"),
        ("secretary_signature", "TEXT"),
    ]
    
    # Check existing columns
    cursor.execute("PRAGMA table_info(reports)")
    existing_columns = [col[1] for col in cursor.fetchall()]
    
    # Add new columns
    for column_name, column_type in new_columns:
        if column_name not in existing_columns:
            try:
                cursor.execute(f"ALTER TABLE reports ADD COLUMN {column_name} {column_type}")
                print(f"✅ Added column: {column_name}")
            except sqlite3.OperationalError as e:
                print(f"⚠️  Could not add {column_name}: {e}")
        else:
            print(f"⏭️  Column already exists: {column_name}")
    
    conn.commit()
    conn.close()
    
    print("\n✅ Migration completed successfully!")

if __name__ == "__main__":
    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at {DB_PATH}")
        print("The database will be created automatically when the app starts.")
    else:
        migrate()
