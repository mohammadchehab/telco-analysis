#!/usr/bin/env python3
"""
Script to fix the 'existing' status issue on production.
This script updates any capabilities with 'existing' status to 'new' status
so they appear properly in the Kanban board.
"""

import sqlite3
import sys
import os
from pathlib import Path

def fix_existing_status(db_path):
    """
    Fix capabilities with 'existing' status by changing them to 'new'
    """
    try:
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print(f"🔍 Checking database: {db_path}")
        
        # First, let's see what capabilities have 'existing' status
        cursor.execute("SELECT id, name, status FROM capabilities WHERE status = 'existing'")
        existing_capabilities = cursor.fetchall()
        
        if not existing_capabilities:
            print("✅ No capabilities with 'existing' status found. Database is already clean!")
            return True
        
        print(f"⚠️  Found {len(existing_capabilities)} capabilities with 'existing' status:")
        for cap_id, name, status in existing_capabilities:
            print(f"   - ID {cap_id}: {name} (status: {status})")
        
        # Update all capabilities with 'existing' status to 'new'
        cursor.execute("UPDATE capabilities SET status = 'new' WHERE status = 'existing'")
        updated_count = cursor.rowcount
        
        # Commit the changes
        conn.commit()
        
        print(f"✅ Successfully updated {updated_count} capabilities from 'existing' to 'new' status")
        
        # Verify the changes
        cursor.execute("SELECT id, name, status FROM capabilities WHERE status = 'new' AND name IN (SELECT name FROM capabilities WHERE status = 'new')")
        updated_capabilities = cursor.fetchall()
        
        print("📋 Updated capabilities:")
        for cap_id, name, status in updated_capabilities:
            print(f"   - ID {cap_id}: {name} (status: {status})")
        
        # Show final status distribution
        cursor.execute("SELECT status, COUNT(*) FROM capabilities GROUP BY status ORDER BY status")
        status_distribution = cursor.fetchall()
        
        print("\n📊 Final status distribution:")
        for status, count in status_distribution:
            print(f"   - {status}: {count} capabilities")
        
        conn.close()
        return True
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def main():
    """
    Main function to run the fix
    """
    print("🔧 Fixing 'existing' status issue on production")
    print("=" * 50)
    
    # Default database path for production
    default_db_path = "./telco_analysis.db"
    
    # Check if database path is provided as argument
    if len(sys.argv) > 1:
        db_path = sys.argv[1]
    else:
        db_path = default_db_path
    
    # Check if database file exists
    if not os.path.exists(db_path):
        print(f"❌ Database file not found: {db_path}")
        print("Usage: python fix_existing_status.py [database_path]")
        print(f"Default path: {default_db_path}")
        sys.exit(1)
    
    # Create backup before making changes
    backup_path = f"{db_path}.backup.$(date +%Y%m%d_%H%M%S)"
    try:
        import shutil
        shutil.copy2(db_path, backup_path)
        print(f"💾 Database backed up to: {backup_path}")
    except Exception as e:
        print(f"⚠️  Warning: Could not create backup: {e}")
        response = input("Continue without backup? (y/N): ")
        if response.lower() != 'y':
            print("❌ Aborting due to backup failure")
            sys.exit(1)
    
    # Run the fix
    success = fix_existing_status(db_path)
    
    if success:
        print("\n✅ Fix completed successfully!")
        print("🎉 Capabilities with 'existing' status have been updated to 'new'")
        print("📱 They should now appear properly in the Kanban board")
    else:
        print("\n❌ Fix failed!")
        sys.exit(1)

if __name__ == "__main__":
    main() 