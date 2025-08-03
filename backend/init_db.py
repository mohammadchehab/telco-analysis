#!/usr/bin/env python3
"""
Initialize database with default data
"""

from sqlalchemy.orm import Session
from core.database import engine, get_db
from models.models import User, Capability, Domain, Attribute
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def init_db():
    """Initialize database with default data"""
    db = next(get_db())
    
    try:
        # Create tables first
        from models.models import Base
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created/verified")
        
        # Check if default user already exists
        existing_user = db.query(User).filter(User.username == "admin").first()
        if not existing_user:
            # Create default admin user
            hashed_password = pwd_context.hash("admin123")
            admin_user = User(
                username="admin",
                email="admin@telco.com",
                password_hash=hashed_password,
                role="admin",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            print("✅ Default admin user created (username: admin, password: admin123)")
        else:
            print("✅ Admin user already exists")
        
        # Initialize TMF processes
        try:
            from migration.init_tmf_processes import init_tmf_processes
            init_tmf_processes()
        except Exception as e:
            print(f"⚠️  TMF processes initialization warning: {e}")
        
        print("✅ Database initialization complete!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error initializing database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Initializing database...")
    init_db()
    print("✅ Database initialization complete!") 