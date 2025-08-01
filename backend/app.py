from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.database import engine
from models import models
from api import capabilities, domains, auth, attributes

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

# Create FastAPI app
app = FastAPI(
    title="Telco Capability Analysis API",
    description="API for managing telco capabilities, domains, and attributes",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(capabilities.router)
app.include_router(domains.router)
app.include_router(auth.router)
app.include_router(attributes.router)
print("✅ Routers included successfully")

@app.get("/")
def read_root():
    return {"message": "Telco Capability Analysis API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    print("🌐 Starting server on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000) 