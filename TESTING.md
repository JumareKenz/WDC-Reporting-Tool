# WDC Reporting System - Testing Documentation

## Stack Detection

**Backend:**
- Framework: FastAPI (Python 3.12)
- ORM: SQLAlchemy
- Database: PostgreSQL (production) / SQLite (development)
- Auth: JWT (HS256)
- Validation: Pydantic

**Frontend:**
- Framework: React 18 + Vite
- Router: React Router v6
- State: TanStack Query (React Query)
- HTTP: Axios
- UI: Tailwind CSS + Lucide Icons

**Deployment:**
- Backend: Render
- Frontend: Vercel
- Production URLs:
  - API: https://kad-wdc.onrender.com
  - Frontend: https://kadwdc.vercel.app

## Local Setup Instructions

### Prerequisites
- Python 3.12+
- Node.js 18+
- Git

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Environment variables (create .env file)
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///./wdc.db
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Run migrations (create tables)
python -c "from app.database import Base, engine; Base.metadata.create_all(bind=engine)"

# Seed database with test data
python seed_data.py

# Start server
uvicorn app.main:app --reload --port 8000
```

Backend should be running at: http://localhost:8000
API docs available at: http://localhost:8000/docs

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Environment variables (create .env file)
VITE_API_BASE_URL=http://localhost:8000/api

# Start dev server
npm run dev
```

Frontend should be running at: http://localhost:5173

### Verify Setup

1. Backend health check: http://localhost:8000/api/health
2. Frontend loads without errors
3. Login with test user:
   - Email: `state.admin@kaduna.gov.ng`
   - Password: `demo123`

## Test Users

| Role | Email | Password | Ward/LGA |
|------|-------|----------|----------|
| WDC Secretary | wdc.bgw.1@kaduna.gov.ng | demo123 | Magajin Gari I, Birnin Gwari |
| LGA Coordinator | coord.bgw@kaduna.gov.ng | demo123 | Birnin Gwari |
| State Official | state.admin@kaduna.gov.ng | demo123 | All |

## Running Tests

### Backend Tests
```bash
cd backend
pytest tests/ -v --cov=app --cov-report=html
```

### Frontend Tests
```bash
cd frontend
npm test
```

### E2E Tests
```bash
cd e2e
npm install
npx playwright test
```

### Load Tests
```bash
cd backend
k6 run load_test.js
```

## Test Coverage Goals

- Backend: >80% code coverage
- Frontend: >70% code coverage
- E2E: All critical user flows
- Load: 50+ concurrent users without errors
