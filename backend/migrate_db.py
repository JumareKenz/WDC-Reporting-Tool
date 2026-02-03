import os
import sys

# Ensure backend/app is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.database import engine

def migrate():
    print(f"Migrating database using: {engine.url}")
    
    # New columns for Reports table
    new_columns = [
        ("health_opd_total", "INTEGER DEFAULT 0"),
        ("health_opd_under5_total", "INTEGER DEFAULT 0"),
        ("health_anc_total", "INTEGER DEFAULT 0"),
        ("items_donated_govt_count", "INTEGER DEFAULT 0"),
        ("items_donated_govt_types", "TEXT"),
        ("group_photo_path", "TEXT")
    ]
    
    with engine.connect() as conn:
        for col_name, col_type in new_columns:
            try:
                # Attempt to add column in its own transaction
                stmt = text(f"ALTER TABLE reports ADD COLUMN {col_name} {col_type}")
                conn.execute(stmt)
                conn.commit()
                print(f"Added column: {col_name}")
            except Exception as e:
                # If using Postgres, transaction might be aborted, so rollback
                conn.rollback()
                
                err_str = str(e).lower()
                if "duplicate column" in err_str or "already exists" in err_str:
                     print(f"Column {col_name} already exists. Skipping.")
                else:
                     print(f"Warning/Error adding {col_name}: {e}")
        
    print("Migration attempt completed.")

if __name__ == "__main__":
    migrate()
