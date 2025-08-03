#!/usr/bin/env python3
"""
Reset admin password in production database
"""

import os
import sys
from sqlalchemy.orm import Session
from core.database import engine, get_db
from models.models import User
import bcrypt

def reset_admin_password(new_password: str = "admin123"):
    """Reset admin password in the database"""
    db = next(get_db())
    
    try:
        # Find admin user
        admin_user = db.query(User).filter(User.username == "admin").first()
        
        if not admin_user:
            print("❌ Admin user not found in database")
            return False
        
        # Hash the new password with bcrypt
        password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
        
        # Update the password
        admin_user.password_hash = password_hash.decode('utf-8')
        db.commit()
        
        print(f"✅ Admin password reset successfully!")
        print(f"👤 Username: admin")
        print(f"🔑 Password: {new_password}")
        return True
        
    except Exception as e:
        print(f"❌ Error resetting password: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        new_password = sys.argv[1]
    else:
        new_password = "admin123"
    
    print("🔐 Resetting admin password...")
    success = reset_admin_password(new_password)
    
    if success:
        print("🎉 Password reset completed!")
    else:
        print("💥 Password reset failed!")
        sys.exit(1) 