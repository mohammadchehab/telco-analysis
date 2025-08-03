#!/usr/bin/env python3
"""
Migration script to add uploads table for RAG functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from core.database import DATABASE_URL
from models.models import Base, Upload

def migrate_uploads():
    """Add uploads table to database"""
    try:
        print("🔄 Starting uploads table migration...")
        
        # Create engine
        engine = create_engine(DATABASE_URL)
        
        # Check if uploads table already exists
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='uploads'
            """))
            
            if result.fetchone():
                print("✅ Uploads table already exists")
                return
        
        # Create uploads table
        print("📝 Creating uploads table...")
        Upload.__table__.create(engine, checkfirst=True)
        
        print("✅ Uploads table created successfully")
        
        # Verify table creation
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='uploads'
            """))
            
            if result.fetchone():
                print("✅ Uploads table verification successful")
            else:
                print("❌ Uploads table verification failed")
                
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        raise

if __name__ == "__main__":
    migrate_uploads() 