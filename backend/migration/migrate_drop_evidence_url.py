"""
Migration script to drop evidence_url column from vendor_scores table.
This script removes the evidence_url column that is no longer needed.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from core.database import get_db
from models.models import VendorScore
from dotenv import load_dotenv

# Load environment variables
load_dotenv("config.env")

def get_database_url():
    """Get database URL from environment or use default"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        # Default to SQLite if no DATABASE_URL is set
        database_url = "sqlite:///telco_analysis.db"
    return database_url

def drop_evidence_url_column():
    """Drop evidence_url column from vendor_scores table if it exists"""
    engine = create_engine(get_database_url())
    
    try:
        with engine.connect() as conn:
            # Check if evidence_url column exists
            result = conn.execute(text("PRAGMA table_info(vendor_scores)"))
            columns = [row[1] for row in result.fetchall()]
            
            if "evidence_url" in columns:
                # SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
                print("🔄 evidence_url column found. Recreating vendor_scores table...")
                
                # Get all data from the current table
                result = conn.execute(text("""
                    SELECT id, capability_id, attribute_id, vendor_id, vendor, weight, 
                           score, score_numeric, score_decision, research_type, research_date, created_at
                    FROM vendor_scores
                """))
                rows = result.fetchall()
                
                # Create new table without evidence_url column
                conn.execute(text("""
                    CREATE TABLE vendor_scores_new (
                        id INTEGER PRIMARY KEY,
                        capability_id INTEGER NOT NULL,
                        attribute_id INTEGER NOT NULL,
                        vendor_id INTEGER,
                        vendor VARCHAR NOT NULL,
                        weight INTEGER DEFAULT 50,
                        score VARCHAR NOT NULL,
                        score_numeric FLOAT NOT NULL,
                        score_decision VARCHAR,
                        research_type VARCHAR DEFAULT 'capability_research',
                        research_date TIMESTAMP,
                        created_at TIMESTAMP
                    )
                """))
                
                # Copy data to new table
                for row in rows:
                    conn.execute(text("""
                        INSERT INTO vendor_scores_new 
                        (id, capability_id, attribute_id, vendor_id, vendor, weight, 
                         score, score_numeric, score_decision, research_type, research_date, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """), row)
                
                # Drop old table and rename new table
                conn.execute(text("DROP TABLE vendor_scores"))
                conn.execute(text("ALTER TABLE vendor_scores_new RENAME TO vendor_scores"))
                
                print("✅ Successfully dropped evidence_url column from vendor_scores table")
            else:
                print("✅ evidence_url column does not exist in vendor_scores table")
                
    except Exception as e:
        print(f"❌ Error dropping evidence_url column: {e}")
        raise

def drop_evidence_url_from_process_vendor_scores():
    """Drop evidence_url column from process_vendor_scores table if it exists"""
    engine = create_engine(get_database_url())
    
    try:
        with engine.connect() as conn:
            # Check if evidence_url column exists
            result = conn.execute(text("PRAGMA table_info(process_vendor_scores)"))
            columns = [row[1] for row in result.fetchall()]
            
            if "evidence_url" in columns:
                # SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
                print("🔄 evidence_url column found in process_vendor_scores. Recreating table...")
                
                # Get all data from the current table
                result = conn.execute(text("""
                    SELECT id, process_id, vendor, score, score_level, score_decision, 
                           research_date, created_at
                    FROM process_vendor_scores
                """))
                rows = result.fetchall()
                
                # Create new table without evidence_url column
                conn.execute(text("""
                    CREATE TABLE process_vendor_scores_new (
                        id INTEGER PRIMARY KEY,
                        process_id INTEGER NOT NULL,
                        vendor VARCHAR NOT NULL,
                        score FLOAT NOT NULL,
                        score_level VARCHAR NOT NULL,
                        score_decision TEXT,
                        research_date TIMESTAMP,
                        created_at TIMESTAMP
                    )
                """))
                
                # Copy data to new table
                for row in rows:
                    conn.execute(text("""
                        INSERT INTO process_vendor_scores_new 
                        (id, process_id, vendor, score, score_level, score_decision, research_date, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """), row)
                
                # Drop old table and rename new table
                conn.execute(text("DROP TABLE process_vendor_scores"))
                conn.execute(text("ALTER TABLE process_vendor_scores_new RENAME TO process_vendor_scores"))
                
                print("✅ Successfully dropped evidence_url column from process_vendor_scores table")
            else:
                print("✅ evidence_url column does not exist in process_vendor_scores table")
                
    except Exception as e:
        print(f"❌ Error dropping evidence_url column from process_vendor_scores: {e}")
        raise

def main():
    """Run the complete migration"""
    print("🔄 Starting evidence_url column removal migration...")
    
    try:
        # Step 1: Drop evidence_url from vendor_scores table
        drop_evidence_url_column()
        
        # Step 2: Drop evidence_url from process_vendor_scores table
        drop_evidence_url_from_process_vendor_scores()
        
        print("✅ evidence_url column removal migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 