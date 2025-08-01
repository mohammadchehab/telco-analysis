from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Dict, Any
from datetime import datetime

from core.database import get_db
from core.auth import auth_manager, get_current_user, get_current_active_user, require_role
from schemas.schemas import UserLogin, UserCreate, UserResponse, UserUpdate, APIResponse
from models.models import User
import hashlib

router = APIRouter(prefix="/api/auth", tags=["authentication"])

@router.post("/login", response_model=APIResponse)
async def login(user_credentials: UserLogin, request: Request, db: Session = Depends(get_db)):
    """Login endpoint that works with both simple and Keycloak auth"""
    try:
        # Authenticate user with current provider
        user_data = auth_manager.authenticate_user(
            user_credentials.username, 
            user_credentials.password, 
            db
        )
        
        if not user_data:
            return APIResponse(
                success=False, 
                error="Invalid username or password"
            )
        
        # Create token
        token = auth_manager.create_token(user_data, db)
        
        # Log activity (for simple auth)
        if auth_manager.provider_type == "simple":
            from core.auth import log_activity
            log_activity(
                user_id=user_data.get("id"),
                username=user_data.get("username"),
                action="login",
                entity_type="user",
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent")
            )
        
        return APIResponse(
            success=True,
            data={
                "access_token": token,
                "token_type": "bearer",
                "user": {
                    "id": user_data.get("id"),
                    "username": user_data.get("username"),
                    "email": user_data.get("email"),
                    "role": user_data.get("role"),
                    "is_active": user_data.get("is_active", True),
                    "dark_mode_preference": user_data.get("dark_mode_preference", True)
                }
            },
            message="Login successful"
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/me", response_model=APIResponse)
async def get_current_user_info(current_user: Dict[str, Any] = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Get current user information"""
    try:
        # Get full user data from database
        user = db.query(User).filter(User.id == current_user.get("id")).first()
        if not user:
            return APIResponse(success=False, error="User not found")
        
        return APIResponse(
            success=True,
            data={
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "role": user.role,
                    "is_active": user.is_active,
                    "dark_mode_preference": user.dark_mode_preference,
                    "created_at": user.created_at.isoformat() if user.created_at else None,
                    "last_login": user.last_login.isoformat() if user.last_login else None
                }
            }
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.put("/preferences", response_model=APIResponse)
async def update_user_preferences(
    preferences: UserUpdate,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user preferences"""
    try:
        user = db.query(User).filter(User.id == current_user.get("id")).first()
        if not user:
            return APIResponse(success=False, error="User not found")
        
        # Update only allowed fields
        if preferences.email is not None:
            # Check if email is already taken by another user
            existing_user = db.query(User).filter(
                (User.email == preferences.email) & (User.id != user.id)
            ).first()
            if existing_user:
                return APIResponse(success=False, error="Email already exists")
            user.email = preferences.email
        
        if preferences.dark_mode_preference is not None:
            user.dark_mode_preference = preferences.dark_mode_preference
        
        db.commit()
        
        return APIResponse(
            success=True,
            data={
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "role": user.role,
                    "is_active": user.is_active,
                    "dark_mode_preference": user.dark_mode_preference,
                    "created_at": user.created_at.isoformat() if user.created_at else None,
                    "last_login": user.last_login.isoformat() if user.last_login else None
                }
            },
            message="Preferences updated successfully"
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/logout", response_model=APIResponse)
async def logout(request: Request, current_user: Dict[str, Any] = Depends(get_current_active_user)):
    """Logout endpoint"""
    try:
        # Log activity (for simple auth)
        if auth_manager.provider_type == "simple":
            from core.auth import log_activity
            log_activity(
                user_id=current_user.get("id"),
                username=current_user.get("username"),
                action="logout",
                entity_type="user",
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent")
            )
        
        return APIResponse(
            success=True,
            message="Logout successful"
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/refresh", response_model=APIResponse)
async def refresh_token(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Refresh token endpoint"""
    try:
        # Create new token
        token = auth_manager.create_token(current_user)
        
        return APIResponse(
            success=True,
            data={
                "access_token": token,
                "token_type": "bearer"
            },
            message="Token refreshed successfully"
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

# User management endpoints (admin only)
@router.get("/users", response_model=APIResponse)
async def get_users(
    current_user: Dict[str, Any] = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Get all users (admin only)"""
    try:
        users = db.query(User).order_by(User.created_at.desc()).all()
        
        user_list = []
        for user in users:
            user_list.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "is_active": user.is_active,
                "created_at": user.created_at,
                "last_login": user.last_login
            })
        
        return APIResponse(
            success=True,
            data={"users": user_list}
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/users", response_model=APIResponse)
async def create_user(
    user_data: UserCreate,
    current_user: Dict[str, Any] = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Create new user (admin only)"""
    try:
        # Check if username or email already exists
        existing_user = db.query(User).filter(
            (User.username == user_data.username) | (User.email == user_data.email)
        ).first()
        
        if existing_user:
            return APIResponse(
                success=False, 
                error="Username or email already exists"
            )
        
        # Hash password
        password_hash = hashlib.sha256(user_data.password.encode()).hexdigest()
        
        # Create new user
        new_user = User(
            username=user_data.username,
            email=user_data.email,
            password_hash=password_hash,
            role=user_data.role,
            is_active=True,
            created_at=datetime.now()
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        return APIResponse(
            success=True,
            data={
                "message": f"User {user_data.username} created successfully",
                "user_id": new_user.id
            }
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.put("/users/{user_id}", response_model=APIResponse)
async def update_user(
    user_id: int,
    user_data: UserCreate,
    current_user: Dict[str, Any] = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Update user (admin only)"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return APIResponse(success=False, error="User not found")
        
        # Check if new username/email conflicts with existing user
        existing_user = db.query(User).filter(
            ((User.username == user_data.username) | (User.email == user_data.email)) &
            (User.id != user_id)
        ).first()
        
        if existing_user:
            return APIResponse(
                success=False, 
                error="Username or email already exists"
            )
        
        # Update user
        user.username = user_data.username
        user.email = user_data.email
        user.role = user_data.role
        
        if user_data.password:
            user.password_hash = hashlib.sha256(user_data.password.encode()).hexdigest()
        
        db.commit()
        
        return APIResponse(
            success=True,
            message=f"User {user_data.username} updated successfully"
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.delete("/users/{user_id}", response_model=APIResponse)
async def delete_user(
    user_id: int,
    current_user: Dict[str, Any] = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Delete user (admin only)"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return APIResponse(success=False, error="User not found")
        
        # Don't allow admin to delete themselves
        if user.id == current_user.get("id"):
            return APIResponse(
                success=False, 
                error="Cannot delete your own account"
            )
        
        db.delete(user)
        db.commit()
        
        return APIResponse(
            success=True,
            message=f"User {user.username} deleted successfully"
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.patch("/users/{user_id}/status", response_model=APIResponse)
async def update_user_status(
    user_id: int,
    status_update: Dict[str, bool],
    current_user: Dict[str, Any] = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Update user status (admin only)"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return APIResponse(success=False, error="User not found")
        
        # Don't allow admin to deactivate themselves
        if user.id == current_user.get("id") and not status_update.get("is_active", True):
            return APIResponse(
                success=False, 
                error="Cannot deactivate your own account"
            )
        
        user.is_active = status_update.get("is_active", True)
        db.commit()
        
        return APIResponse(
            success=True,
            message=f"User {user.username} status updated successfully"
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e)) 