from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from core.database import engine
from models import models
from api import capabilities, domains, auth, attributes, imports, data_quality, reports, activity_logs, architecture, comprehensive_chat, uploads, url_checker, business_process_canvas
import os
from dotenv import load_dotenv

# Load environment variables from config.env
load_dotenv("config.env")

print("🚀 Starting Telco Capability Analysis API...")

# Create database tables
models.Base.metadata.create_all(bind=engine)
print("✅ Database tables created")

# Initialize database with default data
try:
    from init_db import init_db
    init_db()
    print("✅ Database initialized with default data")
except Exception as e:
    print(f"⚠️ Database initialization warning: {e}")

# Initialize TMF processes if not already present
try:
    from migration.init_tmf_processes import check_tmf_processes_exist, init_tmf_processes
    if not check_tmf_processes_exist():
        print("🔄 Initializing TMF Business Process Framework...")
        init_tmf_processes()
        print("✅ TMF processes initialized")
    else:
        print("✅ TMF processes already exist")
except Exception as e:
    print(f"⚠️ TMF processes initialization warning: {e}")

# Create main FastAPI app
app = FastAPI(
    title="Telco Capability Analysis Platform",
    description="Platform for managing telco capabilities, domains, and attributes",
    version="1.0.0",
    # Disable automatic redirects to prevent localhost redirects in production
    redirect_slashes=False
)

# Create API sub-application
api_app = FastAPI(
    title="Telco Capability Analysis API",
    description="API for managing telco capabilities, domains, and attributes",
    version="1.0.0",
    redirect_slashes=False
)

# Add CORS middleware to main app
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://telco-platform.openbiocure.ai",
        "http://telco-platform.openbiocure.ai"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers in API sub-application
api_app.include_router(capabilities.router)
api_app.include_router(domains.router)
api_app.include_router(auth.router)
api_app.include_router(attributes.router)
api_app.include_router(imports.router)
api_app.include_router(data_quality.router)
api_app.include_router(reports.router)
api_app.include_router(activity_logs.router)
api_app.include_router(architecture.router)
api_app.include_router(comprehensive_chat.router)
api_app.include_router(uploads.router)
api_app.include_router(url_checker.router)
api_app.include_router(business_process_canvas.router)
print("✅ API routers included successfully")

# Add health endpoint to API sub-application
@api_app.get("/health")
async def api_health_check():
    return {"status": "healthy"}

# Mount API sub-application at /api
app.mount("/api", api_app)
print("✅ API mounted at /api")

@app.get("/")
def read_root():
    return {"message": "Telco Capability Analysis Platform"}

if __name__ == "__main__":
    import uvicorn
    print("🌐 Starting server on http://localhost:8000")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        proxy_headers=True,
        forwarded_allow_ips="*"
    ) 