"""
Migration script to create vendors table and populate it with existing vendors.
This script also updates the vendor_scores table to reference the new vendors table.
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

def create_vendors_table():
    """Create vendors table if it doesn't exist"""
    engine = create_engine(get_database_url())
    
    # Create vendors table
    with engine.connect() as conn:
        # Check if vendors table exists
        result = conn.execute(text("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='vendors'
        """))
        
        if not result.fetchone():
            # Create vendors table
            conn.execute(text("""
                CREATE TABLE vendors (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(100) UNIQUE NOT NULL,
                    display_name VARCHAR(200),
                    description TEXT,
                    website_url VARCHAR(500),
                    is_active BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            print("✅ Created vendors table")
        else:
            print("✅ Vendors table already exists")

def populate_vendors():
    """Populate vendors table with existing vendors"""
    engine = create_engine(get_database_url())
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Define default vendors
        default_vendors = [
            {
                "name": "comarch",
                "display_name": "Comarch",
                "description": "Comarch is a global software house that delivers IT solutions for telecommunications, banking, and insurance sectors.",
                "website_url": "https://www.comarch.com/"
            },
            {
                "name": "servicenow",
                "display_name": "ServiceNow",
                "description": "ServiceNow is a cloud computing platform that helps companies manage digital workflows for enterprise operations.",
                "website_url": "https://www.servicenow.com/"
            },
            {
                "name": "salesforce",
                "display_name": "Salesforce",
                "description": "Salesforce is a cloud-based software company that provides customer relationship management (CRM) services.",
                "website_url": "https://www.salesforce.com/"
            }
        ]
        
        # Add vendors if they don't exist
        for vendor_data in default_vendors:
            existing_vendor = db.query(Vendor).filter(Vendor.name == vendor_data["name"]).first()
            if not existing_vendor:
                vendor = Vendor(**vendor_data)
                db.add(vendor)
                print(f"✅ Added vendor: {vendor_data['name']}")
            else:
                print(f"⚠️ Vendor already exists: {vendor_data['name']}")
        
        db.commit()
        print("✅ Vendors table populated successfully")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error populating vendors: {e}")
    finally:
        db.close()

def update_vendor_scores():
    """Update vendor_scores table to reference vendors table"""
    engine = create_engine(get_database_url())
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Check if vendor_id column exists
        result = db.execute(text("PRAGMA table_info(vendor_scores)"))
        columns = [row[1] for row in result.fetchall()]
        
        if "vendor_id" not in columns:
            # Add vendor_id column
            db.execute(text("ALTER TABLE vendor_scores ADD COLUMN vendor_id INTEGER"))
            print("✅ Added vendor_id column to vendor_scores table")
        
        # Update vendor_scores to reference vendors table
        vendors = db.query(Vendor).all()
        vendor_map = {vendor.name: vendor.id for vendor in vendors}
        
        # Get all vendor_scores that don't have vendor_id set
        vendor_scores = db.query(VendorScore).filter(VendorScore.vendor_id.is_(None)).all()
        
        updated_count = 0
        for vendor_score in vendor_scores:
            if vendor_score.vendor in vendor_map:
                vendor_score.vendor_id = vendor_map[vendor_score.vendor]
                updated_count += 1
        
        db.commit()
        print(f"✅ Updated {updated_count} vendor_scores with vendor_id references")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error updating vendor_scores: {e}")
    finally:
        db.close()

def main():
    """Run the complete migration"""
    print("🔄 Starting vendor migration...")
    
    try:
        # Step 1: Create vendors table
        create_vendors_table()
        
        # Step 2: Populate vendors table
        populate_vendors()
        
        # Step 3: Update vendor_scores table
        update_vendor_scores()
        
        print("✅ Vendor migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")

if __name__ == "__main__":
    main() 