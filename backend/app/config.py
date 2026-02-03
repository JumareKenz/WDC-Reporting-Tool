import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Security
SECRET_KEY = os.getenv("SECRET_KEY", "kaduna-wdc-secret-key-2026-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# Database
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{BASE_DIR}/wdc.db"  # fallback to SQLite if env not set
)

# File Upload
# File Upload
UPLOAD_DIR_ENV = os.getenv("UPLOAD_DIR")
if UPLOAD_DIR_ENV:
    UPLOAD_DIR = Path(UPLOAD_DIR_ENV)
else:
    UPLOAD_DIR = BASE_DIR / "uploads"

VOICE_NOTES_DIR = UPLOAD_DIR / "voice_notes"
MAX_VOICE_NOTE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".m4a", ".wav", ".ogg", ".webm"}

# Create upload directories if they don't exist
try:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    VOICE_NOTES_DIR.mkdir(parents=True, exist_ok=True)
except Exception as e:
    print(f"Warning: Could not create upload directories at {UPLOAD_DIR}: {e}")
    # Fallback to temp dir if permission error
    import tempfile
    UPLOAD_DIR = Path(tempfile.gettempdir()) / "wdc_uploads"
    VOICE_NOTES_DIR = UPLOAD_DIR / "voice_notes"
    try:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        VOICE_NOTES_DIR.mkdir(parents=True, exist_ok=True)
        print(f"Using fallback upload directory: {UPLOAD_DIR}")
    except Exception as e2:
        print(f"Critical: Could not create fallback upload directory: {e2}")

# CORS - Allowed origins for API access
# Can be overridden via ALLOWED_ORIGINS environment variable (comma-separated)
_default_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8080",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8080",
    # Allow any IP on local network (for mobile testing)
    "http://192.168.0.105:8080",
    "http://192.168.0.105:5173",
    "http://192.168.0.105:3000",
    "http://192.168.0.105:8000",
    # Production frontend - Vercel
    "https://kadwdc.vercel.app",
    "https://www.kadwdc.vercel.app",
    # Allow all Vercel preview deployments
    "https://*.vercel.app",
]

# Allow environment variable override for production
_env_origins = os.getenv("ALLOWED_ORIGINS", "")
if _env_origins:
    # If environment variable is set, use it and merge with production URLs
    ALLOWED_ORIGINS = _env_origins.split(",") + [
        "https://kadwdc.vercel.app",
        "http://localhost:5173",
    ]
else:
    # Use defaults
    ALLOWED_ORIGINS = _default_origins

# Clean up origins list (remove empty strings and whitespace)
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()]
