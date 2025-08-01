from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from core.database import get_db
from services.domain_service import DomainService
from schemas.schemas import (
    DomainCreate, DomainUpdate, DomainResponse, APIResponse
)

router = APIRouter(prefix="/api/capabilities", tags=["domains"])

# Domain CRUD Operations
@router.get("/{capability_id}/domains", response_model=APIResponse)
async def get_domains(capability_id: int, db: Session = Depends(get_db)):
    """Get domains by capability ID"""
    try:
        domains = DomainService.get_domains_by_capability(db, capability_id)
        return APIResponse(
            success=True,
            data={"domains": [domain.model_dump() for domain in domains]}
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/name/{capability_name}/domains", response_model=APIResponse)
async def get_domains_by_name(capability_name: str, db: Session = Depends(get_db)):
    """Get domains by capability name"""
    try:
        domains = DomainService.get_domains_by_capability_name(db, capability_name)
        return APIResponse(
            success=True,
            data=domains
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/{capability_id}/domains", response_model=APIResponse)
async def create_domain(capability_id: int, domain: DomainCreate, db: Session = Depends(get_db)):
    """Create domain by capability ID"""
    try:
        db_domain = DomainService.create_domain(db, capability_id, domain)
        return APIResponse(
            success=True,
            data={"id": db_domain.id, "message": "Domain created successfully"},
            message="Domain created successfully"
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/name/{capability_name}/domains", response_model=APIResponse)
async def create_domain_by_name(capability_name: str, domain: DomainCreate, db: Session = Depends(get_db)):
    """Create domain by capability name"""
    try:
        db_domain = DomainService.create_domain_by_capability_name(db, capability_name, domain)
        return APIResponse(
            success=True,
            data={"id": db_domain.id, "message": "Domain created successfully"},
            message="Domain created successfully"
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.put("/domains/{domain_id}", response_model=APIResponse)
async def update_domain(domain_id: int, domain: DomainUpdate, db: Session = Depends(get_db)):
    """Update domain"""
    try:
        db_domain = DomainService.update_domain(db, domain_id, domain)
        if not db_domain:
            return APIResponse(success=False, error="Domain not found")
        
        return APIResponse(
            success=True,
            message="Domain updated successfully"
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.put("/name/{capability_name}/domains/{domain_id}", response_model=APIResponse)
async def update_domain_by_name(capability_name: str, domain_id: int, domain: DomainUpdate, db: Session = Depends(get_db)):
    """Update domain by capability name"""
    try:
        db_domain = DomainService.update_domain_by_capability_name(db, capability_name, domain_id, domain)
        if not db_domain:
            return APIResponse(success=False, error="Domain not found")
        
        return APIResponse(
            success=True,
            message="Domain updated successfully"
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.delete("/domains/{domain_id}", response_model=APIResponse)
async def delete_domain(domain_id: int, db: Session = Depends(get_db)):
    """Delete domain"""
    try:
        success = DomainService.delete_domain(db, domain_id)
        if not success:
            return APIResponse(success=False, error="Domain not found")
        
        return APIResponse(
            success=True,
            message="Domain deleted successfully"
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.delete("/name/{capability_name}/domains/{domain_id}", response_model=APIResponse)
async def delete_domain_by_name(capability_name: str, domain_id: int, db: Session = Depends(get_db)):
    """Delete domain by capability name"""
    try:
        success = DomainService.delete_domain_by_capability_name(db, capability_name, domain_id)
        if not success:
            return APIResponse(success=False, error="Domain not found")
        
        return APIResponse(
            success=True,
            message="Domain deleted successfully"
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e)) 