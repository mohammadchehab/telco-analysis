#!/usr/bin/env python3
"""
Migration script to add pinned_menu_items column to users table
"""
import sqlite3
import os
from pathlib import Path

def migrate_pinned_menu_items():
    """Add pinned_menu_items column to users table"""
    db_path = Path(__file__).parent / "telco_analysis.db"
    
    if not db_path.exists():
        print("Database file not found. Please run the application first to create the database.")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'pinned_menu_items' not in columns:
            print("Adding pinned_menu_items column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN pinned_menu_items TEXT DEFAULT '[]'")
            conn.commit()
            print("Successfully added pinned_menu_items column")
        else:
            print("pinned_menu_items column already exists")
        
        conn.close()
        
    except Exception as e:
        print(f"Error during migration: {e}")
        if conn:
            conn.close()

if __name__ == "__main__":
    migrate_pinned_menu_items() 