from sqlalchemy import text, inspect
from .database import engine

def run_migrations():
    """check and run database migrations on startup"""
    print(f"checking database migrations...")
    
    # New columns for Reports table
    # Format: (column_name, sql_type)
    new_columns = [
        ("health_opd_total", "INTEGER DEFAULT 0"),
        ("health_opd_under5_total", "INTEGER DEFAULT 0"),
        ("health_anc_total", "INTEGER DEFAULT 0"),
        ("items_donated_govt_count", "INTEGER DEFAULT 0"),
        ("items_donated_govt_types", "TEXT"),
        ("group_photo_path", "TEXT"),
        ("decline_reason", "TEXT"),
        ("submission_id", "VARCHAR(36)"),
        # New health & facility columns
        ("health_general_attendance_total", "INTEGER DEFAULT 0"),
        ("health_routine_immunization_total", "INTEGER DEFAULT 0"),
        ("facility_renovated", "VARCHAR(10)"),
        ("facility_renovated_count", "INTEGER DEFAULT 0"),
        ("facility_renovations", "TEXT"),
        ("items_donated_other_specify", "TEXT"),
        ("items_donated_govt_other_specify", "TEXT"),
        ("items_repaired_other_specify", "TEXT"),
        ("awareness_topic", "TEXT"),
        # New Y/N toggles and facility fields for donations/repairs
        ("items_donated_wdc_yn", "VARCHAR(3)"),
        ("items_donated_facility", "TEXT"),
        ("items_donated_govt_yn", "VARCHAR(3)"),
        ("items_donated_govt_facility", "TEXT"),
        ("items_repaired_yn", "TEXT"),
        ("items_repaired_facility", "TEXT"),
    ]
    
    try:
        inspector = inspect(engine)
        existing_columns = [col['name'] for col in inspector.get_columns('reports')]
        
        with engine.connect() as conn:
            for col_name, col_type in new_columns:
                if col_name not in existing_columns:
                    print(f"Migrating: Adding column {col_name}...")
                    try:
                        stmt = text(f"ALTER TABLE reports ADD COLUMN {col_name} {col_type}")
                        conn.execute(stmt)
                        conn.commit()
                        print(f"Successfully added column: {col_name}")
                    except Exception as e:
                        conn.rollback()
                        print(f"Error adding {col_name}: {e}")
                else:
                    print(f"Column {col_name} already exists. Skipping.")
                    
    except Exception as e:
        print(f"Migration check failed: {e}")
        
    print("Database migration check completed.")
