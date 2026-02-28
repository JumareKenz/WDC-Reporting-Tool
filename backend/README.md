# Kaduna State WDC Digital Reporting System - Backend

FastAPI-based backend for the Ward Development Committee digital reporting system.

## Features

- JWT-based authentication with role-based access control
- RESTful API endpoints for all user roles
- SQLite database (easily migrates to PostgreSQL)
- File upload support for voice notes
- Comprehensive analytics and reporting
- Mock AI report generation

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Configuration settings
│   ├── database.py          # SQLAlchemy setup
│   ├── models.py            # Database models
│   ├── schemas.py           # Pydantic schemas
│   ├── auth.py              # JWT authentication
│   ├── dependencies.py      # FastAPI dependencies
│   └── routers/
│       ├── auth.py          # Login endpoints
│       ├── reports.py       # Report CRUD + voice notes
│       ├── lgas.py          # LGA and ward data
│       ├── notifications.py # Notification system
│       ├── feedback.py      # Feedback/chat
│       ├── investigations.py # Investigation notes
│       └── analytics.py     # State dashboard analytics
├── uploads/                 # Voice note storage
│   └── voice_notes/
├── seed_data.py            # Database seeding script
├── requirements.txt        # Python dependencies
└── README.md              # This file
```

## Setup Instructions

### 1. Install Dependencies

Make sure you have Python 3.8+ installed, then install the required packages:

```bash
pip install -r requirements.txt
```

### 2. Seed the Database

Populate the database with demo data (all 23 Kaduna LGAs, sample users, reports):

```bash
python seed_data.py
```

This will create:
- All 23 Kaduna State LGAs
- Sample wards for each LGA
- Demo users for all roles
- Sample reports and data

**Demo Login Credentials:**
- State Official: `state.admin@kaduna.gov.ng` / `demo123`
- LGA Coordinator: `coord.chk@kaduna.gov.ng` / `demo123`
- WDC Secretary: `wdc.chk.cen@kaduna.gov.ng` / `demo123`

### 3. Run the Server

Start the development server:

```bash
uvicorn app.main:app --reload
```

The API will be available at: `http://localhost:8000`

## API Documentation

Once the server is running, access the interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Database

The system uses SQLite by default (`wdc.db` file created in the backend directory).

To reset the database:
1. Delete the `wdc.db` file
2. Run `python seed_data.py` again

## User Roles

### WDC Secretary (Ward Level)
- Submit monthly reports with optional voice notes
- View own submission history
- Receive notifications from LGA Coordinator

### LGA Coordinator (LGA Level)
- View all wards in their LGA
- Track submission status
- Send notifications to WDC Secretaries
- Review reports
- Mini feedback/chat with secretaries

### State Official (State Level)
- View all LGAs and wards state-wide
- Cross-LGA analytics and comparisons
- Generate AI-assisted summary reports
- Add investigation notes
- Advanced analytics and trends

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info

### Reports
- `POST /api/reports` - Submit new report (with voice note upload)
- `GET /api/reports` - Get reports for current user's ward
- `GET /api/reports/{id}` - Get report details
- `PATCH /api/reports/{id}/review` - Mark report as reviewed
- `GET /api/reports/check-submitted` - Check submission status

### LGAs and Wards
- `GET /api/lgas` - Get all LGAs
- `GET /api/lgas/{id}` - Get LGA details
- `GET /api/lgas/{id}/wards` - Get wards with submission status
- `GET /api/lgas/{id}/missing-reports` - Get missing reports
- `GET /api/lgas/{id}/reports` - Get all reports for LGA
- `GET /api/wards/{id}` - Get ward details
- `GET /api/voice-notes/{id}/download` - Download voice note

### Notifications
- `GET /api/notifications` - Get notifications
- `PATCH /api/notifications/{id}/read` - Mark as read
- `POST /api/notifications/mark-all-read` - Mark all as read
- `POST /api/notifications/send` - Send notification (coordinators/officials)

### Feedback
- `GET /api/feedback` - Get feedback messages
- `POST /api/feedback` - Send feedback message
- `PATCH /api/feedback/{id}/read` - Mark as read

### Investigations
- `GET /api/investigations` - Get investigation notes (state officials)
- `POST /api/investigations` - Create investigation
- `GET /api/investigations/{id}` - Get investigation details
- `PATCH /api/investigations/{id}` - Update investigation
- `DELETE /api/investigations/{id}` - Delete investigation

### Analytics
- `GET /api/analytics/overview` - State-wide overview
- `GET /api/analytics/lga-comparison` - Compare all LGAs
- `GET /api/analytics/trends` - Submission trends over time
- `POST /api/analytics/ai-report` - Generate AI-assisted report

## Configuration

Edit `app/config.py` to customize:

- `SECRET_KEY` - JWT secret key (change in production!)
- `DATABASE_URL` - Database connection string
- `UPLOAD_DIR` - Voice notes storage location
- `MAX_VOICE_NOTE_SIZE` - Max file size (default: 10MB)
- `ALLOWED_ORIGINS` - CORS allowed origins

## Testing

Use the Swagger UI at `/docs` to test all endpoints interactively.

Example test flow:
1. Login as WDC Secretary
2. Submit a report
3. Login as LGA Coordinator
4. View wards and missing reports
5. Login as State Official
6. Generate analytics and AI report

## Production Deployment

For production deployment:

1. Change `SECRET_KEY` in `config.py`
2. Switch to PostgreSQL (update `DATABASE_URL`)
3. Set up proper CORS origins
4. Use a production WSGI server (gunicorn)
5. Set up HTTPS
6. Configure file storage (S3, Azure Blob, etc.)
7. Set up monitoring and logging

## Troubleshooting

**Database locked error:**
- Close any database browser tools
- Ensure only one instance is running

**Import errors:**
- Ensure all dependencies are installed: `pip install -r requirements.txt`

**Port already in use:**
- Change port: `uvicorn app.main:app --port 8001`

## License

Kaduna State Government - Ward Development Committee Digital Reporting System
