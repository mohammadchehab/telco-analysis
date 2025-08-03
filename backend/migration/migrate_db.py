#!/usr/bin/env python3
"""
Database migration script to update vendor_scores table schema
"""
import sqlite3
import os
from pathlib import Path

def migrate_database():
    """Migrate the database to add version fields"""
    db_path = Path(__file__).parent / "telco_analysis.db"
    
    if not db_path.exists():
        print("❌ Database file not found. Please run the application first to create the database.")
        return
    
    print("🔄 Starting database migration...")
    
    try:
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if version columns already exist
        cursor.execute("PRAGMA table_info(capabilities)")
        capability_columns = [column[1] for column in cursor.fetchall()]
        
        cursor.execute("PRAGMA table_info(domains)")
        domain_columns = [column[1] for column in cursor.fetchall()]
        
        cursor.execute("PRAGMA table_info(attributes)")
        attribute_columns = [column[1] for column in cursor.fetchall()]
        
        # Add version fields to capabilities table
        if 'version_major' not in capability_columns:
            print("📝 Adding version fields to capabilities table...")
            cursor.execute("ALTER TABLE capabilities ADD COLUMN version_major INTEGER DEFAULT 1")
            cursor.execute("ALTER TABLE capabilities ADD COLUMN version_minor INTEGER DEFAULT 0")
            cursor.execute("ALTER TABLE capabilities ADD COLUMN version_patch INTEGER DEFAULT 0")
            cursor.execute("ALTER TABLE capabilities ADD COLUMN version_build INTEGER DEFAULT 0")
            print("✅ Version fields added to capabilities table")
        
        # Add version and hash fields to domains table
        if 'content_hash' not in domain_columns:
            print("📝 Adding version and hash fields to domains table...")
            cursor.execute("ALTER TABLE domains ADD COLUMN content_hash TEXT")
            cursor.execute("ALTER TABLE domains ADD COLUMN version TEXT")
            cursor.execute("ALTER TABLE domains ADD COLUMN import_batch TEXT")
            cursor.execute("ALTER TABLE domains ADD COLUMN import_date TIMESTAMP")
            cursor.execute("ALTER TABLE domains ADD COLUMN is_active BOOLEAN")
            cursor.execute("ALTER TABLE domains ADD COLUMN description TEXT")
            cursor.execute("ALTER TABLE domains ADD COLUMN importance TEXT")
            print("✅ Version and hash fields added to domains table")
        
        # Add version and hash fields to attributes table
        if 'content_hash' not in attribute_columns:
            print("📝 Adding version and hash fields to attributes table...")
            cursor.execute("ALTER TABLE attributes ADD COLUMN content_hash TEXT")
            cursor.execute("ALTER TABLE attributes ADD COLUMN version TEXT")
            cursor.execute("ALTER TABLE attributes ADD COLUMN import_batch TEXT")
            cursor.execute("ALTER TABLE attributes ADD COLUMN import_date TIMESTAMP")
            cursor.execute("ALTER TABLE attributes ADD COLUMN is_active BOOLEAN")
            print("✅ Version and hash fields added to attributes table")
        
        # Update existing records with default values
        print("🔄 Updating existing records...")
        
        # Update capabilities with default version
        cursor.execute("""
            UPDATE capabilities 
            SET version_major = 1, version_minor = 0, version_patch = 0, version_build = 0
            WHERE version_major IS NULL
        """)
        
        # Check if we added new columns and update them
        cursor.execute("PRAGMA table_info(domains)")
        updated_domain_columns = [column[1] for column in cursor.fetchall()]
        
        if 'is_active' in updated_domain_columns:
            # Update domains with default values
            cursor.execute("""
                UPDATE domains 
                SET content_hash = '', version = '1.0', is_active = 1, importance = 'medium'
                WHERE content_hash IS NULL OR content_hash = ''
            """)
        
        cursor.execute("PRAGMA table_info(attributes)")
        updated_attribute_columns = [column[1] for column in cursor.fetchall()]
        
        if 'is_active' in updated_attribute_columns:
            # Update attributes with default values
            cursor.execute("""
                UPDATE attributes 
                SET content_hash = '', version = '1.0', is_active = 1
                WHERE content_hash IS NULL OR content_hash = ''
            """)
        
        # Commit changes
        conn.commit()
        print("✅ Database migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database() 