#!/usr/bin/env python
"""
Database Reset Script - Clear Submissions Data

This script safely removes all submission-related data while preserving:
- User accounts and credentials
- LGA/Ward organizational structure  
- System configuration
- Form definitions

Usage:
    python scripts/reset_submissions.py

WARNING: This permanently deletes all report submissions, voice notes,
and report-related notifications. Use with caution.
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import SessionLocal, engine
from app.models import Report, VoiceNote, Notification


def confirm_reset():
    """Prompt user to confirm the destructive operation."""
    print("\n" + "=" * 60)
    print("  WDC REPORTING TOOL - DATABASE RESET SCRIPT")
    print("=" * 60)
    print("\nThis script will PERMANENTLY DELETE:")
    print("  - All report submissions")
    print("  - All voice notes/recordings")
    print("  - All report-related notifications")
    print("\nThe following will be PRESERVED:")
    print("  - User accounts and credentials")
    print("  - LGA and Ward structure")
    print("  - Form definitions")
    print("  - Feedback messages")
    print("  - Investigation notes")
    print("\n" + "=" * 60)
    
    response = input("\nType 'CONFIRM RESET' to proceed: ")
    return response.strip() == "CONFIRM RESET"


def reset_submissions():
    """Clear all submission data from the database."""
    db = SessionLocal()
    
    try:
        # Get counts before deletion for reporting
        voice_note_count = db.query(VoiceNote).count()
        report_count = db.query(Report).count()
        notification_count = db.query(Notification).filter(
            Notification.notification_type.in_(['REPORT_SUBMITTED', 'REPORT_MISSING'])
        ).count()
        
        print(f"\nFound {report_count} reports, {voice_note_count} voice notes, "
              f"{notification_count} report notifications")
        
        # Delete in order to respect foreign key constraints
        print("\n[1/3] Deleting voice notes...")
        deleted_vn = db.query(VoiceNote).delete(synchronize_session=False)
        print(f"       Deleted {deleted_vn} voice notes")
        
        print("[2/3] Deleting report-related notifications...")
        deleted_notif = db.query(Notification).filter(
            Notification.notification_type.in_(['REPORT_SUBMITTED', 'REPORT_MISSING'])
        ).delete(synchronize_session=False)
        print(f"       Deleted {deleted_notif} notifications")
        
        print("[3/3] Deleting reports...")
        deleted_reports = db.query(Report).delete(synchronize_session=False)
        print(f"       Deleted {deleted_reports} reports")
        
        # Commit all changes
        db.commit()
        
        print("\n" + "=" * 60)
        print("  RESET COMPLETE")
        print("=" * 60)
        print(f"\nSummary:")
        print(f"  - Reports deleted: {deleted_reports}")
        print(f"  - Voice notes deleted: {deleted_vn}")
        print(f"  - Notifications deleted: {deleted_notif}")
        print("\nThe database is ready for fresh submissions.\n")
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"\nERROR: Reset failed - {str(e)}")
        print("Database has been rolled back. No changes were made.\n")
        return False
        
    finally:
        db.close()


def main():
    """Main entry point."""
    if not confirm_reset():
        print("\nReset cancelled. No changes were made.\n")
        sys.exit(0)
    
    success = reset_submissions()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
