from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import sys
import os

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.models import Base, User, Capability
from core.database import get_db
import hashlib

def init_database():
    """Initialize the database with tables and default data"""
    print("🚀 Starting Telco Capability Analysis API...")
    
    # Create database engine
    engine = create_engine("sqlite:///telco_analysis.db")
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created")
    
    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Check if dark_mode_preference column exists, if not add it
        try:
            db.execute(text("SELECT dark_mode_preference FROM users LIMIT 1"))
            print("✅ dark_mode_preference column already exists")
        except Exception:
            print("🔄 Adding dark_mode_preference column to users table...")
            db.execute(text("ALTER TABLE users ADD COLUMN dark_mode_preference BOOLEAN DEFAULT 1"))
            db.commit()
            print("✅ dark_mode_preference column added")
        
        # Check if version fields exist in capabilities table, if not add them
        try:
            db.execute(text("SELECT version_major FROM capabilities LIMIT 1"))
            print("✅ version fields already exist in capabilities table")
        except Exception:
            print("🔄 Adding version fields to capabilities table...")
            db.execute(text("ALTER TABLE capabilities ADD COLUMN version_major INTEGER DEFAULT 1"))
            db.execute(text("ALTER TABLE capabilities ADD COLUMN version_minor INTEGER DEFAULT 0"))
            db.execute(text("ALTER TABLE capabilities ADD COLUMN version_patch INTEGER DEFAULT 0"))
            db.execute(text("ALTER TABLE capabilities ADD COLUMN version_build INTEGER DEFAULT 0"))
            db.commit()
            print("✅ version fields added to capabilities table")
        
        # Check if version fields exist in domains table, if not add them
        try:
            db.execute(text("SELECT content_hash FROM domains LIMIT 1"))
            print("✅ version fields already exist in domains table")
        except Exception:
            print("🔄 Adding version fields to domains table...")
            db.execute(text("ALTER TABLE domains ADD COLUMN content_hash TEXT DEFAULT ''"))
            db.execute(text("ALTER TABLE domains ADD COLUMN version TEXT DEFAULT '1.0'"))
            db.execute(text("ALTER TABLE domains ADD COLUMN import_batch TEXT"))
            db.execute(text("ALTER TABLE domains ADD COLUMN import_date DATETIME DEFAULT CURRENT_TIMESTAMP"))
            db.execute(text("ALTER TABLE domains ADD COLUMN is_active BOOLEAN DEFAULT 1"))
            db.commit()
            print("✅ version fields added to domains table")
        
        # Check if version fields exist in attributes table, if not add them
        try:
            db.execute(text("SELECT content_hash FROM attributes LIMIT 1"))
            print("✅ version fields already exist in attributes table")
        except Exception:
            print("🔄 Adding version fields to attributes table...")
            db.execute(text("ALTER TABLE attributes ADD COLUMN content_hash TEXT DEFAULT ''"))
            db.execute(text("ALTER TABLE attributes ADD COLUMN version TEXT DEFAULT '1.0'"))
            db.execute(text("ALTER TABLE attributes ADD COLUMN import_batch TEXT"))
            db.execute(text("ALTER TABLE attributes ADD COLUMN import_date DATETIME DEFAULT CURRENT_TIMESTAMP"))
            db.execute(text("ALTER TABLE attributes ADD COLUMN is_active BOOLEAN DEFAULT 1"))
            db.commit()
            print("✅ version fields added to attributes table")
        
        # Create default users if they don't exist
        default_users = [
            {
                "username": "admin",
                "email": "admin@telco.com",
                "password": "admin123",
                "role": "admin",
                "dark_mode_preference": True
            },
            {
                "username": "analyst",
                "email": "analyst@telco.com", 
                "password": "analyst123",
                "role": "both",
                "dark_mode_preference": True
            },
            {
                "username": "viewer",
                "email": "viewer@telco.com",
                "password": "viewer123", 
                "role": "viewer",
                "dark_mode_preference": True
            }
        ]
        
        for user_data in default_users:
            existing_user = db.query(User).filter(User.username == user_data["username"]).first()
            if not existing_user:
                password_hash = hashlib.sha256(user_data["password"].encode()).hexdigest()
                user = User(
                    username=user_data["username"],
                    email=user_data["email"],
                    password_hash=password_hash,
                    role=user_data["role"],
                    dark_mode_preference=user_data["dark_mode_preference"]
                )
                db.add(user)
                print(f"✅ User '{user_data['username']}' created")
            else:
                # Update existing user with dark mode preference if not set
                if not hasattr(existing_user, 'dark_mode_preference') or existing_user.dark_mode_preference is None:
                    existing_user.dark_mode_preference = user_data["dark_mode_preference"]
                    print(f"✅ User '{user_data['username']}' updated with dark mode preference")
                else:
                    print(f"✅ User '{user_data['username']}' already exists")
        
        # Create default capabilities if they don't exist
        default_capabilities = [
            "IT Service Management"
        ]
        
        for capability_name in default_capabilities:
            existing_capability = db.query(Capability).filter(Capability.name == capability_name).first()
            if not existing_capability:
                capability = Capability(name=capability_name)
                db.add(capability)
                print(f"✅ Capability '{capability_name}' created")
            else:
                print(f"✅ Capability '{capability_name}' already exists")
        
        db.commit()
        print("🎉 Database initialization completed!")
        
        # Print default users info
        print("📋 Default Users:")
        for user_data in default_users:
            print(f"  👤 {user_data['username'].title()}: {user_data['username']}/{user_data['password']} (role: {user_data['role']})")
        
        print("✅ Database initialized with default data")
        
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_database() 