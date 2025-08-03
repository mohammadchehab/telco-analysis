#!/usr/bin/env python3
"""
Test script to verify PostgreSQL connection
"""
from core.database import engine
from sqlalchemy import text

def test_connection():
    try:
        print("Testing PostgreSQL connection...")
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("✅ PostgreSQL connection successful!")
            return True
    except Exception as e:
        print(f"❌ PostgreSQL connection failed: {e}")
        return False

if __name__ == "__main__":
    test_connection() 