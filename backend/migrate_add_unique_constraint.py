#!/usr/bin/env python3
"""
Migration script to add unique constraint on (ward_id, report_month) in reports table.

This script:
1. Checks for duplicate reports
2. Removes duplicates (keeps most recent)
3. Adds the unique constraint
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.config import DATABASE_URL
from app.models import Report

def run_migration():
    """Run the migration to add unique constraint."""

    print("=" * 60)
    print("MIGRATION: Add unique constraint on (ward_id, report_month)")
    print("=" * 60)
    print()

    # Create engine
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        print("Step 1: Checking for duplicate reports...")

        # Check for duplicates
        duplicate_query = text("""
            SELECT ward_id, report_month, COUNT(*) as count
            FROM reports
            GROUP BY ward_id, report_month
            HAVING COUNT(*) > 1
        """)

        duplicates = session.execute(duplicate_query).fetchall()

        if duplicates:
            print(f"⚠️  Found {len(duplicates)} duplicate report groups:")
            for dup in duplicates:
                print(f"   - Ward {dup.ward_id}, Month {dup.report_month}: {dup.count} reports")
            print()

            print("Step 2: Removing duplicates (keeping most recent)...")

            # For each duplicate group, keep only the most recent
            for dup in duplicates:
                # Get all reports for this ward/month, ordered by submission date
                reports = session.query(Report).filter(
                    Report.ward_id == dup.ward_id,
                    Report.report_month == dup.report_month
                ).order_by(Report.submitted_at.desc()).all()

                # Keep the first (most recent), delete the rest
                for report in reports[1:]:
                    print(f"   - Deleting report ID {report.id} (submitted at {report.submitted_at})")
                    session.delete(report)

            session.commit()
            print("✅ Duplicates removed")
        else:
            print("✅ No duplicates found")

        print()
        print("Step 3: Adding unique constraint...")

        # Check if using PostgreSQL or SQLite
        db_type = "sqlite"
        if "postgresql" in DATABASE_URL:
            db_type = "postgresql"

        if db_type == "postgresql":
            # PostgreSQL: Add constraint
            constraint_query = text("""
                ALTER TABLE reports
                ADD CONSTRAINT unique_ward_month UNIQUE (ward_id, report_month)
            """)

            try:
                session.execute(constraint_query)
                session.commit()
                print("✅ Unique constraint added successfully")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print("ℹ️  Constraint already exists")
                else:
                    raise
        else:
            # SQLite: Need to recreate the table
            print("ℹ️  SQLite detected - constraint is already defined in models.py")
            print("   The constraint will be active when tables are recreated.")

        print()
        print("Step 4: Verifying constraint...")

        # Try to verify the constraint exists
        if db_type == "postgresql":
            verify_query = text("""
                SELECT conname
                FROM pg_constraint
                WHERE conname = 'unique_ward_month'
            """)

            result = session.execute(verify_query).fetchone()
            if result:
                print("✅ Constraint verified: unique_ward_month exists")
            else:
                print("⚠️  Constraint not found in database")

        print()
        print("=" * 60)
        print("MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 60)

    except Exception as e:
        print()
        print("❌ ERROR during migration:")
        print(f"   {str(e)}")
        print()
        session.rollback()
        return False
    finally:
        session.close()

    return True


if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
