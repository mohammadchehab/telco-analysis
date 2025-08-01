#!/usr/bin/env python3
"""
Database initialization script to create default users and data.
"""
import hashlib
from datetime import datetime
from sqlalchemy.orm import Session
from core.database import SessionLocal, engine
from models.models import User, Capability, ActivityLog
from schemas.schemas import CapabilityCreate

def init_db():
    """Initialize database with default data"""
    db = SessionLocal()
    try:
        # Create tables
        from models.models import Base
        Base.metadata.create_all(bind=engine)
        
        # Check if admin user exists
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            print("Creating admin user...")
            admin_user = User(
                username="admin",
                email="admin@telco.com",
                password_hash=hashlib.sha256("admin123".encode()).hexdigest(),
                role="admin",
                is_active=True,
                created_at=datetime.now()
            )
            db.add(admin_user)
            db.commit()
            print("✅ Admin user created: admin/admin123")
        else:
            print("✅ Admin user already exists")
        
        # Check if analyst user exists
        analyst_user = db.query(User).filter(User.username == "analyst").first()
        if not analyst_user:
            print("Creating analyst user...")
            analyst_user = User(
                username="analyst",
                email="analyst@telco.com",
                password_hash=hashlib.sha256("analyst123".encode()).hexdigest(),
                role="both",
                is_active=True,
                created_at=datetime.now()
            )
            db.add(analyst_user)
            db.commit()
            print("✅ Analyst user created: analyst/analyst123")
        else:
            print("✅ Analyst user already exists")
        
        # Check if viewer user exists
        viewer_user = db.query(User).filter(User.username == "viewer").first()
        if not viewer_user:
            print("Creating viewer user...")
            viewer_user = User(
                username="viewer",
                email="viewer@telco.com",
                password_hash=hashlib.sha256("viewer123".encode()).hexdigest(),
                role="viewer",
                is_active=True,
                created_at=datetime.now()
            )
            db.add(viewer_user)
            db.commit()
            print("✅ Viewer user created: viewer/viewer123")
        else:
            print("✅ Viewer user already exists")
        
        # Check if sample capabilities exist
        sample_capabilities = [
            {
                "name": "IT Service Management",
                "description": "IT Service Management capabilities for telco services"
            }
        ]
        
        for cap_data in sample_capabilities:
            existing_cap = db.query(Capability).filter(Capability.name == cap_data["name"]).first()
            if not existing_cap:
                print(f"Creating capability: {cap_data['name']}")
                capability = Capability(
                    name=cap_data["name"],
                    description=cap_data["description"],
                    status="new",
                    created_at=datetime.now()
                )
                db.add(capability)
                db.commit()
                print(f"✅ Capability '{cap_data['name']}' created")
            else:
                print(f"✅ Capability '{cap_data['name']}' already exists")
        
        print("\n🎉 Database initialization completed!")
        print("\n📋 Default Users:")
        print("  👤 Admin: admin/admin123 (role: admin)")
        print("  👤 Analyst: analyst/analyst123 (role: both)")
        print("  👤 Viewer: viewer/viewer123 (role: viewer)")
        
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db() 