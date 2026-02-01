from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .config import ALLOWED_ORIGINS
from .routers import auth, reports, lgas, notifications, feedback, investigations, analytics, forms, users

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title="Kaduna State WDC Digital Reporting System API",
    description="Backend API for Ward Development Committee reporting and monitoring",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(lgas.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(feedback.router, prefix="/api")
app.include_router(investigations.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(forms.router, prefix="/api")
app.include_router(users.router, prefix="/api")


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "message": "Kaduna State WDC Digital Reporting System API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "active"
    }


@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    from datetime import datetime

    return {
        "success": True,
        "data": {
            "status": "healthy",
            "timestamp": datetime.utcnow(),
            "version": "1.0.0",
            "database": "connected"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
