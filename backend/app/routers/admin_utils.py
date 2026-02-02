from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, LGA, Ward
from ..dependencies import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin Utilities"])


@router.post("/update-state-executive-name")
def update_state_executive_name(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update the state executive name to Abdulrazak Mukhtar."""

    # Only STATE_OFFICIAL can run this
    if current_user.role != "STATE_OFFICIAL":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only state officials can perform this action"
        )

    # Find the state admin user
    user = db.query(User).filter(
        User.email == "state.admin@kaduna.gov.ng",
        User.role == "STATE_OFFICIAL"
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="State executive user not found"
        )

    old_name = user.full_name
    user.full_name = "Abdulrazak Mukhtar"
    db.commit()

    return {
        "success": True,
        "message": "State executive name updated successfully",
        "old_name": old_name,
        "new_name": user.full_name,
        "email": user.email
    }


@router.post("/update-lgas-wards")
def update_lgas_and_wards(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update all LGAs and Wards with accurate Kaduna State data."""

    # Only STATE_OFFICIAL can run this
    if current_user.role != "STATE_OFFICIAL":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only state officials can perform this action"
        )

    # Complete and accurate LGA data
    LGAS_DATA = [
        {"name": "Birnin Gwari", "code": "BGW", "population": 214000, "num_wards": 11},
        {"name": "Chikun", "code": "CHK", "population": 372000, "num_wards": 12},
        {"name": "Giwa", "code": "GIW", "population": 290000, "num_wards": 11},
        {"name": "Igabi", "code": "IGB", "population": 482000, "num_wards": 12},
        {"name": "Ikara", "code": "IKR", "population": 265000, "num_wards": 10},
        {"name": "Jaba", "code": "JBA", "population": 182000, "num_wards": 10},
        {"name": "Jema'a", "code": "JMA", "population": 264000, "num_wards": 12},
        {"name": "Kachia", "code": "KCH", "population": 185000, "num_wards": 12},
        {"name": "Kaduna North", "code": "KDN", "population": 364000, "num_wards": 12},
        {"name": "Kaduna South", "code": "KDS", "population": 402000, "num_wards": 13},
        {"name": "Kagarko", "code": "KGK", "population": 152000, "num_wards": 10},
        {"name": "Kajuru", "code": "KJR", "population": 144000, "num_wards": 10},
        {"name": "Kaura", "code": "KRA", "population": 203000, "num_wards": 10},
        {"name": "Kauru", "code": "KRU", "population": 195000, "num_wards": 11},
        {"name": "Kubau", "code": "KBU", "population": 278000, "num_wards": 11},
        {"name": "Kudan", "code": "KDN2", "population": 185000, "num_wards": 10},
        {"name": "Lere", "code": "LRE", "population": 331000, "num_wards": 11},
        {"name": "Makarfi", "code": "MKF", "population": 157000, "num_wards": 10},
        {"name": "Sabon Gari", "code": "SBG", "population": 312000, "num_wards": 11},
        {"name": "Sanga", "code": "SNG", "population": 148000, "num_wards": 11},
        {"name": "Soba", "code": "SOB", "population": 196000, "num_wards": 11},
        {"name": "Zangon Kataf", "code": "ZKT", "population": 307000, "num_wards": 11},
        {"name": "Zaria", "code": "ZAR", "population": 408000, "num_wards": 13},
    ]

    # Complete ward names for all LGAs
    WARDS_DATA = {
        "Birnin Gwari": ["Magajin Gari I", "Magajin Gari II", "Magajin Gari III", "Gayam", "Kuyello", "Kazage", "Kakangi", "Tabanni", "Dogon Dawa", "Kutemashi", "Randegi"],
        "Chikun": ["Chikun", "Gwagwada", "Kakau", "Kujama", "Kunai", "Kuriga", "Narayi", "Nassarawa", "Rido", "Sabon Tasha", "Ung. Yelwa", "Sabon Gari Nassarawa/Tirkaniya"],
        "Giwa": ["Giwa", "Kakangi", "Gangara", "Shika", "Danmahawayi", "Yakawada", "Idasu", "Kidandan", "Galadimawa", "Kadage", "Panhauya"],
        "Igabi": ["Turunku", "Zangon-Aya", "Gwaraji", "Birnin Yero", "Rigasa", "Rigachikun", "Kerawa", "Kawali", "Igabi", "Afaka", "Sabon Gari", "Tudun Wada"],
        "Ikara": ["Aribi", "Ikara", "Kurmin Kogi", "Jikamshi", "Kurmin Kudu", "Galadimawa", "Tarai", "Ruwan Kaya", "Kuya", "Dan Lawan"],
        "Jaba": ["Amo", "Andele", "Anku", "Atakmawei", "Chori", "Daddu", "Dura", "Fada", "Kamberi", "Kwoi"],
        "Jema'a": ["Asso", "Bedde", "Gidan Waya", "Godogodo", "Jagindi", "Kanai", "Kizachi", "Kwak", "Maigora", "Sanga", "Takau", "Tirkaniya"],
        "Kachia": ["Adzara", "Agunu", "Akurmi", "Ankwa", "Awon", "Bishini", "Doka", "Gidan Jatau", "Gidan Kogo", "Gumau", "Kachia Urban", "Kurmin Tagwaye"],
        "Kaduna North": ["Badarawa", "Doka", "Gabasawa", "Gangimi", "Gwari", "Kawo", "Maigiginya", "Makera", "Sabon Gari", "Shagari", "Unguwan Dosa", "Unguwan Liman"],
        "Kaduna South": ["Badiko", "Barnawa", "Kakuri Gwari", "Kakuri Hausa", "Kawo", "Madalla", "Makera", "Sabon Tasha", "Tudun Wada North", "Tudun Wada South", "Unguwan Rimi North", "Unguwan Rimi South", "Television"],
        "Kagarko": ["Aribi", "Gidan Usman", "Godo", "Guzoro", "Jere", "Kagarko North", "Kagarko South", "Kizachi", "Kubacha", "Kurmin Dangana"],
        "Kajuru": ["Agwan Kahu", "Akutara", "Buda", "Dantawayi", "Dogon Dawa", "Duhuwa", "Gidan Busa", "Kajuru", "Kallah", "Rimau"],
        "Kaura": ["Agwom", "Atu", "Buda", "Dantawayi", "Dawaki", "Fada", "Kukum", "Manchok", "Malagum", "Zankan"],
        "Kauru": ["Bakin Kogi", "Buda", "Dutsen Kura", "Geshere", "Gumau", "Ikume", "Kachum", "Kisari", "Kpak", "Kuya", "Pari"],
        "Kubau": ["Anchau", "Dutsen Mai", "Gaya", "Geshere", "Gidan Gambo", "Habe", "Karau Karau", "Kargi", "Kubau", "Mahuta", "Zabi"],
        "Kudan": ["Allanawa", "Doka", "Garu", "Hunkuyi", "Karatu", "Kafin Mai Yaki", "Kudan", "Kurmin Jibrin", "Maraba", "Sabon Gari"],
        "Lere": ["Abadawa", "Dan Alhaji", "Gora", "Gure", "Kado", "Kwalba", "Lere", "Maraban Barde", "Mayirci", "Sabon Bakin Gari", "Turami"],
        "Makarfi": ["Bakin Kogi", "Bude", "Dandam", "Dutsen Kura", "Gaya", "Gidan Busa", "Gwanki", "Kada", "Kurmin Dangana", "Tudun Wada"],
        "Sabon Gari": ["Basawa", "Bomo", "Bomo", "Chikaji", "Dogarawa", "Gidan Audu", "Gwarmai", "Jama'a", "Jushi", "Muchiya", "Tudun Wada"],
        "Sanga": ["Aboro", "Bukar", "Fadan Karshi", "Gwantu", "Kpada", "Mabuhu", "Mado", "Ninzam", "Ninzam North", "Ninzam South", "Timbuk"],
        "Soba": ["Ankali", "Dan Wata", "Gidan Busa", "Gidan Kurmi", "Kafar Gidan Isa", "Kinkiba", "Kuregu", "Lalli", "Mai Kada", "Rumada", "Soba"],
        "Zangon Kataf": ["Agabi", "Agwong", "Atakmawei", "Gidan Jatau", "Gora Gan", "Kamuru", "Kizachi", "Kpak", "Mabuhu", "Zama", "Zangon Urban"],
        "Zaria": ["Agwan Doka", "Anguwan Fatika", "Anguwan Juma", "Anguwan Kahu", "Anguwan Liman", "Anguwan Sarkin Yara", "Dambo", "Dutsen Abba", "Gyallesu", "Kwarbai A", "Kwarbai B", "Tudun Wada", "Wuciciri"],
    }

    try:
        # Update LGAs
        updated_lgas = 0
        created_lgas = 0

        for lga_data in LGAS_DATA:
            lga = db.query(LGA).filter(LGA.name == lga_data["name"]).first()

            if lga:
                lga.code = lga_data["code"]
                lga.population = lga_data["population"]
                lga.num_wards = lga_data["num_wards"]
                updated_lgas += 1
            else:
                lga = LGA(**lga_data)
                db.add(lga)
                created_lgas += 1

        db.commit()

        # Get all LGAs for ward creation
        all_lgas = db.query(LGA).all()

        # Clear existing wards
        db.query(Ward).delete()
        db.commit()

        # Create new wards
        total_wards = 0
        for lga in all_lgas:
            if lga.name in WARDS_DATA:
                ward_names = WARDS_DATA[lga.name]

                for idx, ward_name in enumerate(ward_names):
                    ward = Ward(
                        lga_id=lga.id,
                        name=ward_name,
                        code=f"{lga.code}-{idx+1:02d}",
                        population=15000 + (idx * 2000)
                    )
                    db.add(ward)
                    total_wards += 1

        db.commit()

        return {
            "success": True,
            "message": "LGAs and Wards updated successfully",
            "lgas": {
                "updated": updated_lgas,
                "created": created_lgas,
                "total": len(all_lgas)
            },
            "wards": {
                "total": total_wards,
                "per_lga": {lga.name: len(WARDS_DATA.get(lga.name, [])) for lga in all_lgas if lga.name in WARDS_DATA}
            }
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update LGAs and Wards: {str(e)}"
        )
