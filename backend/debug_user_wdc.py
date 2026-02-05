import json
from app.database import SessionLocal
from app.models import User, Ward, LGA

def debug_user(email):
    db = SessionLocal()
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        print(json.dumps({"error": "User not found"}))
        return

    result = {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "lga_id": user.lga_id,
        "ward_id": user.ward_id,
        "ward_exists": False,
        "ward_lga_id": None,
        "lga_exists": False
    }

    if user.ward_id:
        ward = db.query(Ward).filter(Ward.id == user.ward_id).first()
        if ward:
            result["ward_exists"] = True
            result["ward_lga_id"] = ward.lga_id
            
            lga = db.query(LGA).filter(LGA.id == ward.lga_id).first()
            if lga:
                result["lga_exists"] = True
    
    print(f"User ID: {user.id}")
    print(f"User Role: {user.role}")
    print(f"Ward ID in User: {user.ward_id}")
    print(f"Ward Exists in DB: {result['ward_exists']}")
    print(f"LGA ID in Ward: {result['ward_lga_id']}")
    print(f"LGA Exists in DB: {result['lga_exists']}")

if __name__ == "__main__":
    debug_user("wdc.chk.1@kaduna.gov.ng")
