#!/usr/bin/env python3
"""
Database migration script to add URL validation table
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from core.database import DATABASE_URL
from models.models import Base, URLValidation

def migrate_url_validation():
    """Create URLValidation table if it doesn't exist"""
    try:
        engine = create_engine(DATABASE_URL)
        
        # Check if table exists
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='url_validations'
            """))
            
            if not result.fetchone():
                print("Creating url_validations table...")
                Base.metadata.create_all(engine, tables=[URLValidation.__table__])
                print("✅ url_validations table created successfully!")
            else:
                print("✅ url_validations table already exists!")
        
        # Create indexes for better performance
        with engine.connect() as conn:
            # Index on vendor_score_id
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_url_validations_vendor_score_id 
                ON url_validations(vendor_score_id)
            """))
            
            # Index on status
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_url_validations_status 
                ON url_validations(status)
            """))
            
            # Index on last_checked
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_url_validations_last_checked 
                ON url_validations(last_checked)
            """))
            
            conn.commit()
            print("✅ Indexes created successfully!")
            
    except Exception as e:
        print(f"❌ Error creating URLValidation table: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    migrate_url_validation() 