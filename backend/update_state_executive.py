"""
Update the state executive name to Abdulrazak Mukhtar
"""
import sys
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.database import SessionLocal
from app.models import User

db = SessionLocal()

def update_state_executive():
    """Update the main state executive name."""
    print("Updating state executive name...")

    # Find the state admin user by email
    user = db.query(User).filter(
        User.email == "state.admin@kaduna.gov.ng",
        User.role == "STATE_OFFICIAL"
    ).first()

    if user:
        old_name = user.full_name
        user.full_name = "Abdulrazak Mukhtar"
        db.commit()
        print(f"✓ Updated state executive name from '{old_name}' to 'Abdulrazak Mukhtar'")
        print(f"  Email: {user.email}")
        print(f"  Role: {user.role}")
    else:
        print("⚠ State executive user not found")
        print("  Looking for: state.admin@kaduna.gov.ng with role STATE_OFFICIAL")

    db.close()

if __name__ == "__main__":
    update_state_executive()
    print("\n✓ Update complete!")
