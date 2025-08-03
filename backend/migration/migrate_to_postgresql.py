#!/usr/bin/env python3
"""
Migration script to transfer data from SQLite to PostgreSQL
"""
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv("config.env")

def migrate_to_postgresql():
    """Migrate data from SQLite to PostgreSQL"""
    
    # SQLite connection (source)
    sqlite_url = "sqlite:///./telco_analysis.db"
    sqlite_engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
    
    # PostgreSQL connection (target)
    postgres_url = os.getenv("DATABASE_URL")
    if not postgres_url or not postgres_url.startswith("postgresql"):
        print("❌ PostgreSQL DATABASE_URL not configured")
        return False
    
    postgres_engine = create_engine(postgres_url)
    
    try:
        # Test PostgreSQL connection
        with postgres_engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("✅ PostgreSQL connection successful")
        
        # Get all tables from SQLite
        with sqlite_engine.connect() as conn:
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
            tables = [row[0] for row in result.fetchall() if row[0] != 'sqlite_sequence']
        
        print(f"📋 Found {len(tables)} tables to migrate: {tables}")
        
        # Migrate each table
        for table in tables:
            print(f"🔄 Migrating table: {table}")
            
            # Get data from SQLite
            with sqlite_engine.connect() as conn:
                result = conn.execute(text(f"SELECT * FROM {table}"))
                columns = result.keys()
                rows = result.fetchall()
            
            if not rows:
                print(f"   ⚠️  Table {table} is empty, skipping")
                continue
            
            # Insert into PostgreSQL
            with postgres_engine.connect() as conn:
                # Create table if not exists (PostgreSQL will handle this)
                for row in rows:
                    placeholders = ', '.join(['%s'] * len(columns))
                    column_names = ', '.join(columns)
                    query = f"INSERT INTO {table} ({column_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"
                    
                    try:
                        conn.execute(text(query), row)
                    except Exception as e:
                        print(f"   ⚠️  Error inserting row in {table}: {e}")
                        continue
                
                conn.commit()
            
            print(f"   ✅ Migrated {len(rows)} rows from {table}")
        
        print("🎉 Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

if __name__ == "__main__":
    success = migrate_to_postgresql()
    sys.exit(0 if success else 1) 