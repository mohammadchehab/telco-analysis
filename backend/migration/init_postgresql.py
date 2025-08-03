#!/usr/bin/env python3
"""
Initialize PostgreSQL database with tables
"""
import os
from sqlalchemy import create_engine, text
from models import models
from core.database import Base
from dotenv import load_dotenv

# Load environment variables
load_dotenv("config.env")

def init_postgresql():
    """Initialize PostgreSQL database"""
    
    postgres_url = os.getenv("DATABASE_URL")
    if not postgres_url or not postgres_url.startswith("postgresql"):
        print("❌ PostgreSQL DATABASE_URL not configured")
        return False
    
    try:
        # Create engine
        engine = create_engine(postgres_url)
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("✅ PostgreSQL connection successful")
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✅ PostgreSQL tables created successfully")
        
        # Initialize with default data
        try:
            from init_db import init_db
            init_db()
            print("✅ PostgreSQL database initialized with default data")
        except Exception as e:
            print(f"⚠️ Database initialization warning: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ PostgreSQL initialization failed: {e}")
        return False

if __name__ == "__main__":
    init_postgresql() 