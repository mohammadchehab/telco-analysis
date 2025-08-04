#!/usr/bin/env python3
"""
Check what capabilities exist in the database
"""

from sqlalchemy.orm import Session
from core.database import get_db
from models.models import Capability

def check_capabilities():
    """Check all capabilities in the database"""
    db = next(get_db())
    
    try:
        # Get all capabilities
        capabilities = db.query(Capability).all()
        
        print(f"Total capabilities in database: {len(capabilities)}")
        print("\nAll capabilities:")
        print("-" * 50)
        
        for cap in capabilities:
            print(f"ID: {cap.id}")
            print(f"Name: '{cap.name}'")
            print(f"Status: {cap.status}")
            print(f"Created: {cap.created_at}")
            print("-" * 30)
        
        # Check specifically for IT Service Management
        it_service = db.query(Capability).filter(Capability.name == "IT Service Management").first()
        if it_service:
            print(f"\n✅ Found 'IT Service Management':")
            print(f"   ID: {it_service.id}")
            print(f"   Status: {it_service.status}")
            print(f"   Created: {it_service.created_at}")
        else:
            print("\n❌ 'IT Service Management' NOT found in database")
        
        # Check for similar names
        similar = db.query(Capability).filter(
            Capability.name.like("%IT%")
        ).all()
        
        if similar:
            print(f"\nCapabilities with 'IT' in name:")
            for cap in similar:
                print(f"   - '{cap.name}' (ID: {cap.id}, Status: {cap.status})")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("🔍 Checking capabilities in database...")
    check_capabilities() 