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
UPLOAD_DIR = BASE_DIR / "uploads"
VOICE_NOTES_DIR = UPLOAD_DIR / "voice_notes"
MAX_VOICE_NOTE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".m4a", ".wav", ".ogg", ".webm"}

# Create upload directories if they don't exist
VOICE_NOTES_DIR.mkdir(parents=True, exist_ok=True)

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
    # Production frontend
    "https://kadwdc.vercel.app",
]

# Allow environment variable override for production
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", ",".join(_default_origins)).split(",")
