from app.database import SessionLocal
from app.models import User, Ward, LGA

def check_users():
    db = SessionLocal()
    users = db.query(User).all()
    print(f"Total Users: {len(users)}")
    print("-" * 50)
    print(f"{'Email':<30} | {'Role':<15} | {'LGA Hash':<10} | {'Ward Hash':<10} | {'Active'}")
    print("-" * 50)
    for u in users:
        lga_str = str(u.lga_id) if u.lga_id else "None"
        ward_str = str(u.ward_id) if u.ward_id else "None"
        print(f"{u.email:<30} | {u.role:<15} | {lga_str:<10} | {ward_str:<10} | {u.is_active}")
    
    print("-" * 50)
    # Check specific Ward details for first assigned user
    assigned_user = db.query(User).filter(User.ward_id.isnot(None)).first()
    if assigned_user:
        ward = db.query(Ward).filter(Ward.id == assigned_user.ward_id).first()
        print(f"\nUser {assigned_user.email} is assigned to Ward ID {assigned_user.ward_id}")
        if ward:
            print(f"Ward Name: {ward.name}, LGA ID: {ward.lga_id}")
            lga = db.query(LGA).filter(LGA.id == ward.lga_id).first()
            if lga:
                print(f"LGA Name: {lga.name}")
        else:
            print("USER HAS WARD_ID BUT WARD NOT FOUND IN DB!")

if __name__ == "__main__":
    check_users()
