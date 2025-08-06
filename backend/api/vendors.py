from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from core.database import get_db
from models.models import Vendor
from schemas.schemas import APIResponse, VendorCreate, VendorUpdate, VendorResponse
from datetime import datetime
from models.models import VendorScore, ProcessVendorScore

router = APIRouter(prefix="/vendors", tags=["vendors"])

@router.get("/", response_model=APIResponse)
async def get_vendors(db: Session = Depends(get_db)):
    """Get all vendors (both active and inactive)"""
    try:
        vendors = db.query(Vendor).all()  # Show all vendors regardless of activation status
        vendor_data = []
        for vendor in vendors:
            vendor_data.append({
                "id": vendor.id,
                "name": vendor.name,
                "display_name": vendor.display_name,
                "description": vendor.description,
                "website_url": vendor.website_url,
                "is_active": vendor.is_active,
                "created_at": vendor.created_at.isoformat() if vendor.created_at else None,
                "updated_at": vendor.updated_at.isoformat() if vendor.updated_at else None
            })
        return APIResponse(success=True, data={"vendors": vendor_data})
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/active/names", response_model=APIResponse)
async def get_active_vendor_names(db: Session = Depends(get_db)):
    """Get list of active vendor names only"""
    try:
        vendors = db.query(Vendor).filter(Vendor.is_active == True).all()
        vendor_names = [vendor.name for vendor in vendors]
        return APIResponse(success=True, data={"vendors": vendor_names})
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/{vendor_id}", response_model=APIResponse)
async def get_vendor(vendor_id: int, db: Session = Depends(get_db)):
    """Get a specific vendor by ID"""
    try:
        vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
        if not vendor:
            return APIResponse(success=False, error="Vendor not found")
        
        vendor_data = {
            "id": vendor.id,
            "name": vendor.name,
            "display_name": vendor.display_name,
            "description": vendor.description,
            "website_url": vendor.website_url,
            "is_active": vendor.is_active,
            "created_at": vendor.created_at.isoformat() if vendor.created_at else None,
            "updated_at": vendor.updated_at.isoformat() if vendor.updated_at else None
        }
        return APIResponse(success=True, data={"vendor": vendor_data})
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/", response_model=APIResponse)
async def create_vendor(vendor_data: VendorCreate, db: Session = Depends(get_db)):
    """Create a new vendor"""
    try:
        # Check if vendor with same name already exists
        existing_vendor = db.query(Vendor).filter(Vendor.name == vendor_data.name).first()
        if existing_vendor:
            return APIResponse(success=False, error="Vendor with this name already exists")
        
        vendor = Vendor(
            name=vendor_data.name,
            display_name=vendor_data.display_name,
            description=vendor_data.description,
            website_url=vendor_data.website_url,
            is_active=vendor_data.is_active if vendor_data.is_active is not None else True
        )
        
        db.add(vendor)
        db.commit()
        db.refresh(vendor)
        
        vendor_response = {
            "id": vendor.id,
            "name": vendor.name,
            "display_name": vendor.display_name,
            "description": vendor.description,
            "website_url": vendor.website_url,
            "is_active": vendor.is_active,
            "created_at": vendor.created_at.isoformat() if vendor.created_at else None,
            "updated_at": vendor.updated_at.isoformat() if vendor.updated_at else None
        }
        
        return APIResponse(success=True, data=vendor_response)
    except Exception as e:
        db.rollback()
        return APIResponse(success=False, error=str(e))

@router.put("/{vendor_id}", response_model=APIResponse)
async def update_vendor(vendor_id: int, vendor_data: VendorUpdate, db: Session = Depends(get_db)):
    """Update an existing vendor"""
    try:
        vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
        if not vendor:
            return APIResponse(success=False, error="Vendor not found")
        
        # Check if name is being changed and if it conflicts with existing vendor
        if vendor_data.name and vendor_data.name != vendor.name:
            existing_vendor = db.query(Vendor).filter(Vendor.name == vendor_data.name).first()
            if existing_vendor:
                return APIResponse(success=False, error="Vendor with this name already exists")
        
        # Update fields
        if vendor_data.name is not None:
            vendor.name = vendor_data.name
        if vendor_data.display_name is not None:
            vendor.display_name = vendor_data.display_name
        if vendor_data.description is not None:
            vendor.description = vendor_data.description
        if vendor_data.website_url is not None:
            vendor.website_url = vendor_data.website_url
        if vendor_data.is_active is not None:
            vendor.is_active = vendor_data.is_active
        
        vendor.updated_at = datetime.now()
        
        db.commit()
        db.refresh(vendor)
        
        vendor_response = {
            "id": vendor.id,
            "name": vendor.name,
            "display_name": vendor.display_name,
            "description": vendor.description,
            "website_url": vendor.website_url,
            "is_active": vendor.is_active,
            "created_at": vendor.created_at.isoformat() if vendor.created_at else None,
            "updated_at": vendor.updated_at.isoformat() if vendor.updated_at else None
        }
        
        return APIResponse(success=True, data=vendor_response)
    except Exception as e:
        db.rollback()
        return APIResponse(success=False, error=str(e))

@router.delete("/{vendor_id}", response_model=APIResponse)
async def delete_vendor(vendor_id: int, db: Session = Depends(get_db)):
    """Delete a vendor (check for constraints first)"""
    try:
        vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
        if not vendor:
            return APIResponse(success=False, error="Vendor not found")
        
        # Check for constraints - vendor scores
        vendor_scores = db.query(VendorScore).filter(VendorScore.vendor_id == vendor_id).count()
        if vendor_scores > 0:
            return APIResponse(
                success=False, 
                error=f"Cannot delete vendor '{vendor.display_name}' because it has {vendor_scores} vendor score(s) associated with it. Please remove or reassign these scores first."
            )
        
        # Check for constraints - process vendor scores (using vendor name)
        process_vendor_scores = db.query(ProcessVendorScore).filter(ProcessVendorScore.vendor == vendor.name).count()
        if process_vendor_scores > 0:
            return APIResponse(
                success=False, 
                error=f"Cannot delete vendor '{vendor.display_name}' because it has {process_vendor_scores} process vendor score(s) associated with it. Please remove or reassign these scores first."
            )
        
        # If no constraints, proceed with deletion
        db.delete(vendor)
        db.commit()
        
        return APIResponse(success=True, data={"message": f"Vendor '{vendor.display_name}' deleted successfully"})
    except Exception as e:
        db.rollback()
        return APIResponse(success=False, error=str(e)) 