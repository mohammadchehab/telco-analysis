from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import hashlib
import json
from datetime import datetime, timedelta

from core.database import get_db
from models.models import User, ActivityLog
from schemas.schemas import (
    UserLogin, UserCreate, UserResponse, UserUpdate, APIResponse,
    UserPasswordChange, UserPasswordReset, UserActivityFilter, ActivityLogResponse
)
from core.auth import get_current_user, get_current_active_user, require_role, auth_manager
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])

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
        
        # Log activity
        from core.auth import log_activity
        log_activity(
            user_id=user_data.get("id"),
            username=user_data.get("username"),
            action="login",
            entity_type="user",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            db=db
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
                    "dark_mode_preference": user_data.get("dark_mode_preference", True),
                    "pinned_menu_items": user_data.get("pinned_menu_items", [])
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
                    "pinned_menu_items": json.loads(user.pinned_menu_items) if user.pinned_menu_items else [],
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
        
        if preferences.pinned_menu_items is not None:
            user.pinned_menu_items = json.dumps(preferences.pinned_menu_items)
        
        db.commit()
        
        # Log activity if any changes were made
        from core.auth import log_activity
        changes = []
        if preferences.email is not None:
            changes.append("email updated")
        if preferences.dark_mode_preference is not None:
            changes.append("dark mode preference updated")
        if preferences.pinned_menu_items is not None:
            changes.append("pinned menu items updated")
        
        if changes:
            log_activity(
                user_id=current_user.get("id"),
                username=current_user.get("username"),
                action="update_preferences",
                entity_type="user",
                entity_id=user.id,
                entity_name=user.username,
                details=f"Updated preferences: {', '.join(changes)}",
                db=db
            )
        
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
                    "pinned_menu_items": json.loads(user.pinned_menu_items) if user.pinned_menu_items else [],
                    "created_at": user.created_at.isoformat() if user.created_at else None,
                    "last_login": user.last_login.isoformat() if user.last_login else None
                }
            },
            message="Preferences updated successfully"
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/logout", response_model=APIResponse)
async def logout(request: Request, current_user: Dict[str, Any] = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Logout endpoint"""
    try:
        # Log activity
        from core.auth import log_activity
        log_activity(
            user_id=current_user.get("id"),
            username=current_user.get("username"),
            action="logout",
            entity_type="user",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            db=db
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
        
        # Log activity
        from core.auth import log_activity
        log_activity(
            user_id=current_user.get("id"),
            username=current_user.get("username"),
            action="view",
            entity_type="users",
            details=f"Viewed list of {len(user_list)} users",
            db=db
        )
        
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
        
        # Hash password with bcrypt
        import bcrypt
        password_hash = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
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
        
        # Log activity
        from core.auth import log_activity
        log_activity(
            user_id=current_user.get("id"),
            username=current_user.get("username"),
            action="create",
            entity_type="user",
            entity_id=new_user.id,
            entity_name=new_user.username,
            details=f"Created user with role: {user_data.role}",
            db=db
        )
        
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
        
        # Store old values for logging
        old_username = user.username
        old_role = user.role
        
        # Update user
        user.username = user_data.username
        user.email = user_data.email
        user.role = user_data.role
        
        if user_data.password:
            import bcrypt
            user.password_hash = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        db.commit()
        
        # Log activity
        from core.auth import log_activity
        log_activity(
            user_id=current_user.get("id"),
            username=current_user.get("username"),
            action="update",
            entity_type="user",
            entity_id=user.id,
            entity_name=user.username,
            details=f"Updated user from {old_username} to {user.username}, role: {old_role} → {user.role}",
            db=db
        )
        
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
        
        # Store user info for logging before deletion
        deleted_username = user.username
        deleted_role = user.role
        
        db.delete(user)
        db.commit()
        
        # Log activity
        from core.auth import log_activity
        log_activity(
            user_id=current_user.get("id"),
            username=current_user.get("username"),
            action="delete",
            entity_type="user",
            entity_id=user_id,
            entity_name=deleted_username,
            details=f"Deleted user with role: {deleted_role}",
            db=db
        )
        
        return APIResponse(
            success=True,
            message=f"User {deleted_username} deleted successfully"
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
        
        old_status = user.is_active
        user.is_active = status_update.get("is_active", True)
        db.commit()
        
        # Log activity
        from core.auth import log_activity
        log_activity(
            user_id=current_user.get("id"),
            username=current_user.get("username"),
            action="update_status",
            entity_type="user",
            entity_id=user.id,
            entity_name=user.username,
            details=f"Changed user status from {'active' if old_status else 'inactive'} to {'active' if user.is_active else 'inactive'}",
            db=db
        )
        
        return APIResponse(
            success=True,
            message=f"User {user.username} status updated successfully"
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/users/{user_id}/change-password", response_model=APIResponse)
async def change_user_password(
    user_id: int,
    password_data: UserPasswordReset,
    current_user: Dict[str, Any] = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Change user password (admin only)"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return APIResponse(success=False, error="User not found")
        
        # Hash new password with bcrypt
        import bcrypt
        password_hash = bcrypt.hashpw(password_data.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        user.password_hash = password_hash
        
        db.commit()
        
        # Log activity
        from core.auth import log_activity
        log_activity(
            user_id=current_user.get("id"),
            username=current_user.get("username"),
            action="change_password",
            entity_type="user",
            entity_id=user.id,
            entity_name=user.username,
            details=f"Changed password for user {user.username}",
            db=db
        )
        
        return APIResponse(
            success=True,
            message=f"Password for user {user.username} changed successfully"
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/change-password", response_model=APIResponse)
async def change_own_password(
    password_data: UserPasswordChange,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Change own password"""
    try:
        user = db.query(User).filter(User.id == current_user.get("id")).first()
        if not user:
            return APIResponse(success=False, error="User not found")
        
        # Verify current password
        import bcrypt
        if not bcrypt.checkpw(password_data.current_password.encode('utf-8'), user.password_hash.encode('utf-8')):
            return APIResponse(success=False, error="Current password is incorrect")
        
        # Hash new password
        new_password_hash = bcrypt.hashpw(password_data.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        user.password_hash = new_password_hash
        
        db.commit()
        
        # Log activity
        from core.auth import log_activity
        log_activity(
            user_id=current_user.get("id"),
            username=current_user.get("username"),
            action="change_own_password",
            entity_type="user",
            entity_id=user.id,
            entity_name=user.username,
            details="Changed own password",
            db=db
        )
        
        return APIResponse(
            success=True,
            message="Password changed successfully"
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/users/{user_id}/activities", response_model=APIResponse)
async def get_user_activities(
    user_id: int,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Get activities for a specific user (admin only)"""
    try:
        # Verify user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return APIResponse(success=False, error="User not found")
        
        query = db.query(ActivityLog).filter(ActivityLog.user_id == user_id)
        
        # Apply filters
        if action:
            query = query.filter(ActivityLog.action.contains(action))
        if entity_type:
            query = query.filter(ActivityLog.entity_type.contains(entity_type))
        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                query = query.filter(ActivityLog.created_at >= start_dt)
            except ValueError:
                return APIResponse(success=False, error="Invalid start_date format")
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                query = query.filter(ActivityLog.created_at <= end_dt)
            except ValueError:
                return APIResponse(success=False, error="Invalid end_date format")
        
        # Order by most recent first
        query = query.order_by(ActivityLog.created_at.desc())
        
        # Apply pagination
        total_count = query.count()
        logs = query.offset(offset).limit(limit).all()
        
        # Convert to response format
        log_responses = [
            ActivityLogResponse(
                id=log.id,
                user_id=log.user_id,
                username=log.username,
                action=log.action,
                entity_type=log.entity_type,
                entity_id=log.entity_id,
                entity_name=log.entity_name,
                details=log.details,
                ip_address=log.ip_address,
                user_agent=log.user_agent,
                created_at=log.created_at.isoformat() if log.created_at else None
            )
            for log in logs
        ]
        
        # Log activity
        from core.auth import log_activity
        log_activity(
            user_id=current_user.get("id"),
            username=current_user.get("username"),
            action="view",
            entity_type="user_activities",
            entity_id=user.id,
            entity_name=user.username,
            details=f"Viewed {len(log_responses)} activities for user {user.username}",
            db=db
        )
        
        return APIResponse(
            success=True,
            data={
                "logs": log_responses,
                "total_count": total_count,
                "limit": limit,
                "offset": offset,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error fetching user activities: {str(e)}")
        return APIResponse(success=False, error=f"Failed to fetch user activities: {str(e)}")

@router.get("/users/stats", response_model=APIResponse)
async def get_user_stats(
    current_user: Dict[str, Any] = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Get user statistics (admin only)"""
    try:
        # Total users
        total_users = db.query(User).count()
        
        # Active users
        active_users = db.query(User).filter(User.is_active == True).count()
        
        # Users by role
        role_stats = db.query(
            User.role,
            db.func.count(User.id).label('count')
        ).group_by(User.role).all()
        
        # Recent registrations (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_registrations = db.query(User).filter(
            User.created_at >= thirty_days_ago
        ).count()
        
        # Users with recent activity (last 7 days)
        seven_days_ago = datetime.now() - timedelta(days=7)
        recent_activity_users = db.query(User).filter(
            User.last_login >= seven_days_ago
        ).count()
        
        # Log activity
        from core.auth import log_activity
        log_activity(
            user_id=current_user.get("id"),
            username=current_user.get("username"),
            action="view",
            entity_type="user_stats",
            details=f"Viewed user statistics: {total_users} total users, {active_users} active",
            db=db
        )
        
        return APIResponse(
            success=True,
            data={
                "total_users": total_users,
                "active_users": active_users,
                "inactive_users": total_users - active_users,
                "role_stats": [{"role": stat.role, "count": stat.count} for stat in role_stats],
                "recent_registrations_30d": recent_registrations,
                "recent_activity_7d": recent_activity_users
            }
        )
        
    except Exception as e:
        logger.error(f"Error fetching user stats: {str(e)}")
        return APIResponse(success=False, error=f"Failed to fetch user stats: {str(e)}") 