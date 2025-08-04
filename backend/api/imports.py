import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
from core.database import get_db
from core.auth import get_current_user
from models.models import User
from services.import_service import ImportService
from schemas.schemas import APIResponse, ImportResponse, ImportHistoryItem
from utils.version_manager import VersionManager

router = APIRouter(prefix="/imports", tags=["imports"])

@router.post("/capabilities/{capability_id}/domains", response_model=APIResponse)
async def import_domains(
    capability_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Import domains and attributes from JSON file (supports both simple domains and research files)"""
    try:
        # Check if capability exists
        from models.models import Capability
        capability = db.query(Capability).filter(Capability.id == capability_id).first()
        if not capability:
            return APIResponse(success=False, error="Capability not found")
        
        # Validate file type
        if not file.filename.endswith('.json'):
            return APIResponse(success=False, error="Only JSON files are supported")
        
        # Read and parse JSON file
        try:
            content = await file.read()
            data = json.loads(content.decode('utf-8'))
        except json.JSONDecodeError:
            return APIResponse(success=False, error="Invalid JSON format")
        except Exception as e:
            return APIResponse(success=False, error=f"Error reading file: {str(e)}")
        
        # Detect file format
        file_format = ImportService.detect_file_format(data)
        
        if file_format == "unknown":
            return APIResponse(success=False, error="Unsupported file format. Expected either simple domains format or research file format.")
        
        # Process import based on format
        if file_format == "research_file":
            # Process research file (no validation needed for research format)
            stats = ImportService.process_research_import(
                db, capability_id, data, file.filename
            )
            
            # Get updated capability version
            capability = db.query(Capability).filter(Capability.id == capability_id).first()
            version_string = VersionManager.get_version_string(capability)
            
            return APIResponse(
                success=True,
                data={
                    "import_batch": stats['import_batch'],
                    "import_date": stats['import_date'],
                    "file_type": "research_file",
                    "capability_name": stats.get('capability_name', ''),
                    "analysis_date": stats.get('analysis_date', ''),
                    "total_domains": stats['total_domains'],
                    "new_domains": stats['new_domains'],
                    "updated_domains": stats['updated_domains'],
                    "skipped_domains": stats['skipped_domains'],
                    "total_attributes": stats['total_attributes'],
                    "new_attributes": stats['new_attributes'],
                    "updated_attributes": stats['updated_attributes'],
                    "skipped_attributes": stats['skipped_attributes'],
                    "capability_version": version_string,
                    "market_vendors": stats.get('market_vendors', []),
                    "industry_standards": stats.get('industry_standards', []),
                    "priority_domains": stats.get('priority_domains', []),
                    "priority_attributes": stats.get('priority_attributes', []),
                    "framework_completeness": stats.get('framework_completeness', ''),
                    "next_steps": stats.get('next_steps', '')
                },
                message=f"Research file import completed successfully. {stats['new_domains']} new domains, {stats['updated_domains']} updated domains, {stats['new_attributes']} new attributes, {stats['updated_attributes']} updated attributes."
            )
        
        else:  # simple_domains format
            # Validate JSON structure for simple format
            if not ImportService.validate_json_structure(data):
                return APIResponse(success=False, error="Invalid JSON structure. Expected format: {'domains': [{'domain_name': '...', 'attributes': [...]}]}")
            
            # Process simple domain import
            stats = ImportService.process_domain_import(
                db, capability_id, data['domains'], file.filename
            )
            
            # Get updated capability version
            capability = db.query(Capability).filter(Capability.id == capability_id).first()
            version_string = VersionManager.get_version_string(capability)
            
            return APIResponse(
                success=True,
                data={
                    "import_batch": stats['import_batch'],
                    "import_date": stats['import_date'],
                    "file_type": "simple_domains",
                    "total_domains": stats['total_domains'],
                    "new_domains": stats['new_domains'],
                    "updated_domains": stats['updated_domains'],
                    "skipped_domains": stats['skipped_domains'],
                    "total_attributes": stats['total_attributes'],
                    "new_attributes": stats['new_attributes'],
                    "updated_attributes": stats['updated_attributes'],
                    "skipped_attributes": stats['skipped_attributes'],
                    "capability_version": version_string
                },
                message=f"Import completed successfully. {stats['new_domains']} new domains, {stats['updated_domains']} updated domains, {stats['new_attributes']} new attributes, {stats['updated_attributes']} updated attributes."
            )
        
    except Exception as e:
        return APIResponse(success=False, error=f"Import failed: {str(e)}")

@router.get("/capabilities/{capability_id}/history", response_model=APIResponse)
async def get_import_history(
    capability_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get import history for a capability"""
    try:
        # Check if capability exists
        from models.models import Capability
        capability = db.query(Capability).filter(Capability.id == capability_id).first()
        if not capability:
            return APIResponse(success=False, error="Capability not found")
        
        # Get import history
        history = ImportService.get_import_history(db, capability_id)
        
        return APIResponse(
            success=True,
            data={"history": history},
            message=f"Found {len(history)} import records"
        )
        
    except Exception as e:
        return APIResponse(success=False, error=f"Failed to get import history: {str(e)}")

@router.get("/capabilities/{capability_id}/version", response_model=APIResponse)
async def get_capability_version(
    capability_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current version of a capability"""
    try:
        # Check if capability exists
        from models.models import Capability
        capability = db.query(Capability).filter(Capability.id == capability_id).first()
        if not capability:
            return APIResponse(success=False, error="Capability not found")
        
        version_string = VersionManager.get_version_string(capability)
        
        return APIResponse(
            success=True,
            data={
                "version_major": capability.version_major,
                "version_minor": capability.version_minor,
                "version_patch": capability.version_patch,
                "version_build": capability.version_build,
                "version_string": version_string
            },
            message=f"Current version: {version_string}"
        )
        
    except Exception as e:
        return APIResponse(success=False, error=f"Failed to get version: {str(e)}") 