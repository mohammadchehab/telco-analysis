#!/usr/bin/env python3
"""
Simple migration script to add vendor_id column to vendor_scores table.
This script uses only sqlite3 module and doesn't require SQLAlchemy.
"""

import sqlite3
import os
import sys

def get_database_path():
    """Get database path from environment or use default"""
    database_path = os.getenv("DATABASE_PATH", "telco_analysis.db")
    if not os.path.isabs(database_path):
        # If relative path, look in current directory and parent directories
        current_dir = os.getcwd()
        possible_paths = [
            os.path.join(current_dir, database_path),
            os.path.join(current_dir, "..", database_path),
            os.path.join(current_dir, "..", "..", database_path),
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                return path
    
    return database_path

def add_vendor_id_column():
    """Add vendor_id column to vendor_scores table if it doesn't exist"""
    database_path = get_database_path()
    print(f"🔍 Looking for database at: {database_path}")
    
    if not os.path.exists(database_path):
        print(f"❌ Database not found at {database_path}")
        print("💡 Please make sure the database file exists or set DATABASE_PATH environment variable")
        return False
    
    try:
        # Connect to the database
        conn = sqlite3.connect(database_path)
        cursor = conn.cursor()
        
        # Check if vendor_id column exists
        cursor.execute("PRAGMA table_info(vendor_scores)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if "vendor_id" not in columns:
            # Add vendor_id column
            cursor.execute("ALTER TABLE vendor_scores ADD COLUMN vendor_id INTEGER")
            print("✅ Added vendor_id column to vendor_scores table")
        else:
            print("✅ vendor_id column already exists in vendor_scores table")
        
        # Commit the changes
        conn.commit()
        conn.close()
        
        print("✅ Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        return False

def main():
    """Run the migration"""
    print("🔄 Starting vendor_scores migration...")
    
    success = add_vendor_id_column()
    
    if success:
        print("🎉 Migration completed successfully!")
        sys.exit(0)
    else:
        print("💥 Migration failed!")
        sys.exit(1)

if __name__ == "__main__":
    main() 