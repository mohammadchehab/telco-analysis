from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from core.database import get_db
from services.attribute_service import AttributeService
from schemas.schemas import (
    AttributeCreate, AttributeUpdate, AttributeResponse, APIResponse
)

router = APIRouter(prefix="/api/capabilities", tags=["attributes"])

# Attribute CRUD Operations
@router.get("/{capability_id}/attributes", response_model=APIResponse)
async def get_attributes(capability_id: int, db: Session = Depends(get_db)):
    """Get attributes by capability ID"""
    try:
        attributes = AttributeService.get_attributes_by_capability(db, capability_id)
        return APIResponse(
            success=True,
            data={"attributes": [attribute.model_dump() for attribute in attributes]}
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/{capability_id}/attributes", response_model=APIResponse)
async def create_attribute(capability_id: int, attribute: AttributeCreate, db: Session = Depends(get_db)):
    """Create attribute by capability ID"""
    try:
        db_attribute = AttributeService.create_attribute(db, capability_id, attribute)
        return APIResponse(
            success=True,
            data={"id": db_attribute.id, "message": "Attribute created successfully"},
            message="Attribute created successfully"
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.put("/attributes/{attribute_id}", response_model=APIResponse)
async def update_attribute(attribute_id: int, attribute: AttributeUpdate, db: Session = Depends(get_db)):
    """Update attribute"""
    try:
        db_attribute = AttributeService.update_attribute(db, attribute_id, attribute)
        if not db_attribute:
            return APIResponse(success=False, error="Attribute not found")
        
        return APIResponse(
            success=True,
            message="Attribute updated successfully"
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.delete("/attributes/{attribute_id}", response_model=APIResponse)
async def delete_attribute(attribute_id: int, db: Session = Depends(get_db)):
    """Delete attribute"""
    try:
        success = AttributeService.delete_attribute(db, attribute_id)
        if not success:
            return APIResponse(success=False, error="Attribute not found")
        
        return APIResponse(
            success=True,
            message="Attribute deleted successfully"
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/{capability_id}/domains/{domain_name}/attributes", response_model=APIResponse)
async def get_attributes_by_domain(capability_id: int, domain_name: str, db: Session = Depends(get_db)):
    """Get attributes by domain name within a capability"""
    try:
        attributes = AttributeService.get_attributes_by_domain(db, capability_id, domain_name)
        return APIResponse(
            success=True,
            data={"attributes": [attribute.model_dump() for attribute in attributes]}
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e)) 