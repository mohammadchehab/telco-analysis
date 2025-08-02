from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from core.database import get_db
from models.models import ActivityLog
from schemas.schemas import APIResponse, ActivityLogResponse
from core.auth import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/activity-logs", tags=["activity-logs"])

@router.get("/", response_model=APIResponse)
async def get_activity_logs(
    limit: int = Query(50, ge=1, le=100, description="Number of logs to return"),
    offset: int = Query(0, ge=0, description="Number of logs to skip"),
    action: Optional[str] = Query(None, description="Filter by action"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    username: Optional[str] = Query(None, description="Filter by username"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get activity logs with optional filtering"""
    try:
        query = db.query(ActivityLog)
        
        # Apply filters
        if action:
            query = query.filter(ActivityLog.action.contains(action))
        if entity_type:
            query = query.filter(ActivityLog.entity_type.contains(entity_type))
        if username:
            query = query.filter(ActivityLog.username.contains(username))
        
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
        
        return APIResponse(
            success=True,
            data={
                "logs": log_responses,
                "total_count": total_count,
                "limit": limit,
                "offset": offset
            }
        )
        
    except Exception as e:
        logger.error(f"Error fetching activity logs: {str(e)}")
        return APIResponse(success=False, error=f"Failed to fetch activity logs: {str(e)}")

@router.get("/recent", response_model=APIResponse)
async def get_recent_activity_logs(
    limit: int = Query(10, ge=1, le=50, description="Number of recent logs to return"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get recent activity logs"""
    try:
        logs = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(limit).all()
        
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
        
        return APIResponse(success=True, data={"logs": log_responses})
        
    except Exception as e:
        logger.error(f"Error fetching recent activity logs: {str(e)}")
        return APIResponse(success=False, error=f"Failed to fetch recent activity logs: {str(e)}")

@router.get("/stats", response_model=APIResponse)
async def get_activity_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get activity statistics"""
    try:
        # Total activities
        total_activities = db.query(ActivityLog).count()
        
        # Activities by action type
        action_stats = db.query(
            ActivityLog.action,
            db.func.count(ActivityLog.id).label('count')
        ).group_by(ActivityLog.action).all()
        
        # Activities by entity type
        entity_stats = db.query(
            ActivityLog.entity_type,
            db.func.count(ActivityLog.id).label('count')
        ).group_by(ActivityLog.entity_type).all()
        
        # Recent activity (last 24 hours)
        from datetime import timedelta
        yesterday = datetime.now() - timedelta(days=1)
        recent_activities = db.query(ActivityLog).filter(
            ActivityLog.created_at >= yesterday
        ).count()
        
        return APIResponse(
            success=True,
            data={
                "total_activities": total_activities,
                "recent_activities_24h": recent_activities,
                "action_stats": [{"action": stat.action, "count": stat.count} for stat in action_stats],
                "entity_stats": [{"entity_type": stat.entity_type, "count": stat.count} for stat in entity_stats]
            }
        )
        
    except Exception as e:
        logger.error(f"Error fetching activity stats: {str(e)}")
        return APIResponse(success=False, error=f"Failed to fetch activity stats: {str(e)}") 