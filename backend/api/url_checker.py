from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any, Optional
import os
import logging
from datetime import datetime

from core.database import get_db
from services.url_checker_service import URLCheckerService
from schemas.schemas import APIResponse
from models.models import URLValidation, VendorScore

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/url-checker", tags=["url-checker"])

# Initialize URL checker service with OpenRouter API key
url_checker_service = URLCheckerService(
    openrouter_api_key=os.getenv("OPENROUTER_API_KEY")
)

@router.post("/validate-batch", response_model=APIResponse)
async def validate_urls_batch(
    batch_size: int = 10,
    background: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """Validate a batch of URLs from vendor scores"""
    try:
        if background:
            # Run in background for large batches
            background.add_task(url_checker_service.validate_urls_batch, db, batch_size)
            return APIResponse(
                success=True,
                data={"message": f"URL validation started in background. Processing {batch_size} URLs."}
            )
        else:
            # Run synchronously for small batches
            results = url_checker_service.validate_urls_batch(db, batch_size)
            return APIResponse(
                success=True,
                data={
                    "message": "URL validation completed",
                    "results": results
                }
            )
    except Exception as e:
        logger.error(f"Error in URL validation batch: {str(e)}")
        return APIResponse(success=False, error=str(e))

@router.get("/flagged-urls", response_model=APIResponse)
async def get_flagged_urls(
    capability_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get all flagged URLs with their context"""
    try:
        flagged_urls = url_checker_service.get_flagged_urls(db, capability_id)
        return APIResponse(
            success=True,
            data={
                "flagged_urls": flagged_urls,
                "total_count": len(flagged_urls)
            }
        )
    except Exception as e:
        logger.error(f"Error getting flagged URLs: {str(e)}")
        return APIResponse(success=False, error=str(e))

@router.get("/validation-stats", response_model=APIResponse)
async def get_validation_stats():
    """Get URL validation statistics"""
    try:
        # Test without any database session
        stats = {
            "total_validations": 0,
            "pending": 0,
            "valid": 0,
            "invalid": 0,
            "flagged": 0,
            "capability_stats": []
        }
        
        return APIResponse(success=True, data=stats)
    except Exception as e:
        logger.error(f"Error getting validation stats: {str(e)}")
        return APIResponse(success=False, error=str(e))

@router.put("/update-url/{validation_id}", response_model=APIResponse)
async def update_url(
    validation_id: int,
    new_url: str,
    db: Session = Depends(get_db)
):
    """Update URL for a flagged validation"""
    try:
        success = url_checker_service.update_url(db, validation_id, new_url)
        if success:
            return APIResponse(
                success=True,
                data={"message": "URL updated successfully"}
            )
        else:
            return APIResponse(success=False, error="Validation record not found")
    except Exception as e:
        logger.error(f"Error updating URL: {str(e)}")
        return APIResponse(success=False, error=str(e))

@router.post("/recheck-url/{validation_id}", response_model=APIResponse)
async def recheck_url(
    validation_id: int,
    db: Session = Depends(get_db)
):
    """Recheck a specific URL validation"""
    try:
        success = url_checker_service.recheck_url(db, validation_id)
        if success:
            return APIResponse(
                success=True,
                data={"message": "URL rechecked successfully"}
            )
        else:
            return APIResponse(success=False, error="Validation record not found")
    except Exception as e:
        logger.error(f"Error rechecking URL: {str(e)}")
        return APIResponse(success=False, error=str(e))

@router.get("/validation-details/{validation_id}", response_model=APIResponse)
async def get_validation_details(
    validation_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific URL validation"""
    try:
        validation = db.query(URLValidation).filter(URLValidation.id == validation_id).first()
        if not validation:
            return APIResponse(success=False, error="Validation record not found")
        
        score = validation.vendor_score
        attribute = score.attribute
        capability = score.capability
        
        # Parse AI analysis
        ai_analysis = {}
        if validation.ai_analysis:
            try:
                import json
                ai_analysis = json.loads(validation.ai_analysis)
            except:
                ai_analysis = {"error": "Failed to parse AI analysis"}
        
        # Parse flagged reason
        flagged_reason = []
        if validation.flagged_reason:
            try:
                flagged_reason = json.loads(validation.flagged_reason)
            except:
                flagged_reason = [validation.flagged_reason]
        
        details = {
            "id": validation.id,
            "url": validation.url,
            "original_url": validation.original_url,
            "status": validation.status,
            "http_status": validation.http_status,
            "response_time": validation.response_time,
            "content_length": validation.content_length,
            "content_hash": validation.content_hash,
            "ai_confidence": validation.ai_confidence,
            "flagged_reason": flagged_reason,
            "ai_analysis": ai_analysis,
            "last_checked": validation.last_checked,
            "created_at": validation.created_at,
            "updated_at": validation.updated_at,
            "capability_name": capability.name,
            "domain_name": attribute.domain_name,
            "attribute_name": attribute.attribute_name,
            "vendor": score.vendor,
            "score": score.score,
            "score_decision": score.score_decision,
            "weight": score.weight,
            "research_type": score.research_type
        }
        
        return APIResponse(success=True, data=details)
    except Exception as e:
        logger.error(f"Error getting validation details: {str(e)}")
        return APIResponse(success=False, error=str(e))

@router.delete("/validation/{validation_id}", response_model=APIResponse)
async def delete_validation(
    validation_id: int,
    db: Session = Depends(get_db)
):
    """Delete a URL validation record"""
    try:
        validation = db.query(URLValidation).filter(URLValidation.id == validation_id).first()
        if not validation:
            return APIResponse(success=False, error="Validation record not found")
        
        db.delete(validation)
        db.commit()
        
        return APIResponse(
            success=True,
            data={"message": "Validation record deleted successfully"}
        )
    except Exception as e:
        logger.error(f"Error deleting validation: {str(e)}")
        db.rollback()
        return APIResponse(success=False, error=str(e))

@router.post("/validate-all-pending", response_model=APIResponse)
async def validate_all_pending_urls(
    background: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Validate all pending URLs in the background"""
    try:
        # Get count of pending URLs
        pending_count = db.query(URLValidation).filter(URLValidation.status == "pending").count()
        
        if pending_count == 0:
            return APIResponse(
                success=True,
                data={"message": "No pending URLs to validate"}
            )
        
        # Start background task
        background.add_task(validate_all_pending_background, db)
        
        return APIResponse(
            success=True,
            data={
                "message": f"Started validation of {pending_count} pending URLs in background"
            }
        )
    except Exception as e:
        logger.error(f"Error starting validation of all pending URLs: {str(e)}")
        return APIResponse(success=False, error=str(e))

async def validate_all_pending_background(db: Session):
    """Background task to validate all pending URLs"""
    try:
        pending_validations = db.query(URLValidation).filter(
            URLValidation.status == "pending"
        ).all()
        
        processed = 0
        for validation in pending_validations:
            try:
                success = url_checker_service.recheck_url(db, validation.id)
                if success:
                    processed += 1
                
                # Add small delay to avoid overwhelming servers
                import asyncio
                await asyncio.sleep(1)
                
            except Exception as e:
                logger.error(f"Error processing validation {validation.id}: {str(e)}")
                continue
        
        logger.info(f"Background validation completed. Processed {processed} URLs.")
        
    except Exception as e:
        logger.error(f"Error in background validation: {str(e)}")

@router.get("/capability/{capability_id}/urls", response_model=APIResponse)
async def get_capability_urls(
    capability_id: int,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all URLs for a specific capability"""
    try:
        query = db.query(URLValidation).join(VendorScore).filter(
            VendorScore.capability_id == capability_id
        )
        
        if status:
            query = query.filter(URLValidation.status == status)
        
        validations = query.all()
        
        urls_data = []
        for validation in validations:
            score = validation.vendor_score
            attribute = score.attribute
            
            urls_data.append({
                "id": validation.id,
                "url": validation.url,
                "original_url": validation.original_url,
                "status": validation.status,
                "http_status": validation.http_status,
                "ai_confidence": validation.ai_confidence,
                "last_checked": validation.last_checked,
                "domain_name": attribute.domain_name,
                "attribute_name": attribute.attribute_name,
                "vendor": score.vendor,
                "score": score.score
            })
        
        return APIResponse(
            success=True,
            data={
                "capability_id": capability_id,
                "urls": urls_data,
                "total_count": len(urls_data)
            }
        )
    except Exception as e:
        logger.error(f"Error getting capability URLs: {str(e)}")
        return APIResponse(success=False, error=str(e)) 