import sqlite3
import os

# Define path to database
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "wdc.db")

print(f"Migrating database at: {DB_PATH}")

try:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # List of new columns to add
    new_columns = [
        ("health_opd_total", "INTEGER DEFAULT 0"),
        ("health_opd_under5_total", "INTEGER DEFAULT 0"),
        ("health_anc_total", "INTEGER DEFAULT 0"),
        ("items_donated_govt_count", "INTEGER DEFAULT 0"),
        ("items_donated_govt_types", "TEXT NULL")
    ]

    for col_name, col_type in new_columns:
        try:
            cursor.execute(f"ALTER TABLE reports ADD COLUMN {col_name} {col_type}")
            print(f"Added column: {col_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print(f"Column {col_name} already exists. Skipping.")
            else:
                print(f"Error adding {col_name}: {e}")

    conn.commit()
    print("Migration completed successfully.")
    conn.close()

except Exception as e:
    print(f"Migration failed: {e}")
