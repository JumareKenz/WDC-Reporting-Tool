from sqlalchemy import text
from .database import engine

def run_migrations():
    """check and run database migrations on startup"""
    print(f"checking database migrations...")
    
    # New columns for Reports table
    new_columns = [
        ("health_opd_total", "INTEGER DEFAULT 0"),
        ("health_opd_under5_total", "INTEGER DEFAULT 0"),
        ("health_anc_total", "INTEGER DEFAULT 0"),
        ("items_donated_govt_count", "INTEGER DEFAULT 0"),
        ("items_donated_govt_types", "TEXT"),
        ("group_photo_path", "TEXT"),
        ("decline_reason", "TEXT"),  # For storing LGA coordinator decline reasons
        ("submission_id", "VARCHAR(36)"),  # Client-generated UUID for idempotency
    ]
    
    with engine.connect() as conn:
        for col_name, col_type in new_columns:
            try:
                # Attempt to add column in its own transaction
                # SQLite doesn't support IF NOT EXISTS for ADD COLUMN directly in standard SQL universally, 
                # but we rely on catch-fail for existing columns.
                stmt = text(f"ALTER TABLE reports ADD COLUMN {col_name} {col_type}")
                conn.execute(stmt)
                conn.commit()
                print(f"Added column: {col_name}")
            except Exception as e:
                # If using Postgres, transaction might be aborted, so rollback
                conn.rollback()
                
                err_str = str(e).lower()
                # Check for various SQL drivers' duplicate column messages
                if "duplicate column" in err_str or "already exists" in err_str:
                     # Column already exists, safe to ignore
                     pass
                else:
                     print(f"Warning/Error adding {col_name}: {e}")
        
    print("Database migration check completed.")
