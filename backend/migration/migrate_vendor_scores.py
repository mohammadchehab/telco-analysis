"""
Migration script to add vendor_id column to vendor_scores table.
This script adds the missing vendor_id column that was added to the model but not migrated to production.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from core.database import get_db
from models.models import Vendor, VendorScore
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

def add_vendor_id_column():
    """Add vendor_id column to vendor_scores table if it doesn't exist"""
    engine = create_engine(get_database_url())
    
    try:
        with engine.connect() as conn:
            # Check if vendor_id column exists
            result = conn.execute(text("PRAGMA table_info(vendor_scores)"))
            columns = [row[1] for row in result.fetchall()]
            
            if "vendor_id" not in columns:
                # Add vendor_id column
                conn.execute(text("ALTER TABLE vendor_scores ADD COLUMN vendor_id INTEGER"))
                print("✅ Added vendor_id column to vendor_scores table")
            else:
                print("✅ vendor_id column already exists in vendor_scores table")
                
    except Exception as e:
        print(f"❌ Error adding vendor_id column: {e}")
        raise

def update_vendor_references():
    """Update existing vendor_scores to reference vendors table"""
    engine = create_engine(get_database_url())
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Get all vendors
        vendors = db.query(Vendor).all()
        vendor_map = {vendor.name.lower(): vendor.id for vendor in vendors}
        
        # Get all vendor_scores that don't have vendor_id set
        vendor_scores = db.query(VendorScore).filter(VendorScore.vendor_id.is_(None)).all()
        
        updated_count = 0
        for vendor_score in vendor_scores:
            vendor_name_lower = vendor_score.vendor.lower() if vendor_score.vendor else ""
            if vendor_name_lower in vendor_map:
                vendor_score.vendor_id = vendor_map[vendor_name_lower]
                updated_count += 1
                print(f"DEBUG: Updated vendor_score {vendor_score.id} with vendor_id {vendor_map[vendor_name_lower]} for vendor {vendor_score.vendor}")
        
        db.commit()
        print(f"✅ Updated {updated_count} vendor_scores with vendor_id references")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error updating vendor references: {e}")
        raise
    finally:
        db.close()

def main():
    """Run the complete migration"""
    print("🔄 Starting vendor_scores migration...")
    
    try:
        # Step 1: Add vendor_id column
        add_vendor_id_column()
        
        # Step 2: Update vendor references
        update_vendor_references()
        
        print("✅ Vendor_scores migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 