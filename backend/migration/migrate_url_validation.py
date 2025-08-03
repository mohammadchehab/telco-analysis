#!/usr/bin/env python3
"""
Database migration script to add URL validation table
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from core.database import DATABASE_URL
from models.models import Base

def migrate_url_validation():
    """Add URL validation table to database"""
    
    # Create engine
    engine = create_engine(DATABASE_URL)
    
    # Create URL validation table
    url_validation_table_sql = """
    CREATE TABLE IF NOT EXISTS url_validations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_score_id INTEGER NOT NULL,
        url VARCHAR NOT NULL,
        original_url VARCHAR NOT NULL,
        status VARCHAR DEFAULT 'pending',
        http_status INTEGER,
        response_time FLOAT,
        content_length INTEGER,
        content_hash VARCHAR,
        ai_analysis TEXT,
        ai_confidence FLOAT,
        flagged_reason TEXT,
        last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_score_id) REFERENCES vendor_scores (id) ON DELETE CASCADE
    );
    """
    
    # Create indexes
    indexes_sql = [
        "CREATE INDEX IF NOT EXISTS idx_url_validations_vendor_score_id ON url_validations (vendor_score_id);",
        "CREATE INDEX IF NOT EXISTS idx_url_validations_status ON url_validations (status);",
        "CREATE INDEX IF NOT EXISTS idx_url_validations_last_checked ON url_validations (last_checked);",
        "CREATE INDEX IF NOT EXISTS idx_url_validations_url ON url_validations (url);"
    ]
    
    try:
        with engine.connect() as conn:
            # Create table
            conn.execute(text(url_validation_table_sql))
            conn.commit()
            print("✅ URL validation table created successfully")
            
            # Create indexes
            for index_sql in indexes_sql:
                conn.execute(text(index_sql))
            conn.commit()
            print("✅ URL validation indexes created successfully")
            
    except Exception as e:
        print(f"❌ Error creating URL validation table: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("🔄 Starting URL validation table migration...")
    success = migrate_url_validation()
    if success:
        print("✅ Migration completed successfully")
    else:
        print("❌ Migration failed")
        sys.exit(1) 