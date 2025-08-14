from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import json
from datetime import datetime

from core.database import get_db
from core.auth import get_current_user
from models.models import TMFProcess, ProcessCapabilityMapping, ProcessVendorScore, BusinessProcessCanvas
from schemas.schemas import APIResponse
from services.process_mapping_service import ProcessMappingService

router = APIRouter(prefix="/business-process-canvas", tags=["business-process-canvas"])

@router.get("/processes", response_model=APIResponse)
async def get_tmf_processes(db: Session = Depends(get_db)):
    """Get all TMF processes with vendor scores and capability mappings"""
    try:
        processes = db.query(TMFProcess).filter(TMFProcess.is_active == True).all()
        
        # Enhance with vendor scores and capability mappings
        enhanced_processes = []
        for process in processes:
            # Get vendor scores
            vendor_scores = db.query(ProcessVendorScore).filter(
                ProcessVendorScore.process_id == process.id
            ).all()
            
            # Get capability mappings
            capability_mappings = db.query(ProcessCapabilityMapping).filter(
                ProcessCapabilityMapping.process_id == process.id
            ).all()
            
            process_dict = {
                "id": process.id,
                "process_id": process.process_id,
                "name": process.name,
                "description": process.description,
                "domain": process.domain,
                "phase": process.phase,
                "position_x": process.position_x,
                "position_y": process.position_y,
                "size_width": process.size_width,
                "size_height": process.size_height,
                "color": process.color,
                "vendor_count": len(vendor_scores),
                "top_vendor_score": max([vs.score for vs in vendor_scores]) if vendor_scores else 0,
                "linked_capabilities": [cm.capability.name for cm in capability_mappings if cm.capability],
                "created_at": process.created_at.isoformat() if process.created_at else None,
                "updated_at": process.updated_at.isoformat() if process.updated_at else None
            }
            enhanced_processes.append(process_dict)
        
        return APIResponse(
            success=True,
            data={"processes": enhanced_processes}
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/processes/{process_id}", response_model=APIResponse)
async def get_process_detail(process_id: int, db: Session = Depends(get_db)):
    """Get detailed view of a specific process with all mappings"""
    try:
        process = db.query(TMFProcess).filter(TMFProcess.id == process_id).first()
        if not process:
            return APIResponse(success=False, error="Process not found")
        
        # Get capability mappings with capability details
        capability_mappings = db.query(ProcessCapabilityMapping).filter(
            ProcessCapabilityMapping.process_id == process_id
        ).all()
        
        # Get vendor scores
        vendor_scores = db.query(ProcessVendorScore).filter(
            ProcessVendorScore.process_id == process_id
        ).order_by(ProcessVendorScore.score.desc()).all()
        
        # Get related processes (same domain or phase)
        related_processes = db.query(TMFProcess).filter(
            TMFProcess.id != process_id,
            TMFProcess.is_active == True,
            (TMFProcess.domain == process.domain) | (TMFProcess.phase == process.phase)
        ).limit(5).all()
        
        process_detail = {
            "process": {
                "id": process.id,
                "process_id": process.process_id,
                "name": process.name,
                "description": process.description,
                "domain": process.domain,
                "phase": process.phase,
                "position_x": process.position_x,
                "position_y": process.position_y,
                "size_width": process.size_width,
                "size_height": process.size_height,
                "color": process.color,
                "created_at": process.created_at.isoformat() if process.created_at else None,
                "updated_at": process.updated_at.isoformat() if process.updated_at else None
            },
            "capability_mappings": [
                {
                    "id": cm.id,
                    "capability_id": cm.capability_id,
                    "mapping_type": cm.mapping_type,
                    "confidence_score": cm.confidence_score,
                    "capability": {
                        "id": cm.capability.id,
                        "name": cm.capability.name,
                        "description": cm.capability.description,
                        "status": cm.capability.status
                    } if cm.capability else None
                } for cm in capability_mappings
            ],
            "vendor_scores": [
                {
                    "id": vs.id,
                    "vendor": vs.vendor,
                    "score": vs.score,
                    "score_level": vs.score_level,
                    "score_decision": vs.score_decision,
                    "research_date": vs.research_date.isoformat() if vs.research_date else None
                } for vs in vendor_scores
            ],
            "related_processes": [
                {
                    "id": rp.id,
                    "process_id": rp.process_id,
                    "name": rp.name,
                    "domain": rp.domain,
                    "phase": rp.phase
                } for rp in related_processes
            ]
        }
        
        return APIResponse(success=True, data=process_detail)
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/processes/{process_id}/capability-mapping", response_model=APIResponse)
async def add_capability_mapping(
    process_id: int,
    mapping_data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a capability mapping to a process"""
    try:
        process = db.query(TMFProcess).filter(TMFProcess.id == process_id).first()
        if not process:
            return APIResponse(success=False, error="Process not found")
        
        new_mapping = ProcessCapabilityMapping(
            process_id=process_id,
            capability_id=mapping_data["capability_id"],
            mapping_type=mapping_data.get("mapping_type", "direct"),
            confidence_score=mapping_data.get("confidence_score", 1.0)
        )
        
        db.add(new_mapping)
        db.commit()
        db.refresh(new_mapping)
        
        return APIResponse(
            success=True,
            data={"mapping_id": new_mapping.id},
            message="Capability mapping added successfully"
        )
    except Exception as e:
        db.rollback()
        return APIResponse(success=False, error=str(e))

@router.post("/processes/{process_id}/vendor-score", response_model=APIResponse)
async def add_vendor_score(
    process_id: int,
    vendor_data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a vendor score to a process"""
    try:
        process = db.query(TMFProcess).filter(TMFProcess.id == process_id).first()
        if not process:
            return APIResponse(success=False, error="Process not found")
        
        new_vendor_score = ProcessVendorScore(
            process_id=process_id,
            vendor=vendor_data["vendor"],
            score=vendor_data["score"],
            score_level=vendor_data["score_level"],
            score_decision=vendor_data.get("score_decision")
        )
        
        db.add(new_vendor_score)
        db.commit()
        db.refresh(new_vendor_score)
        
        return APIResponse(
            success=True,
            data={"vendor_score_id": new_vendor_score.id},
            message="Vendor score added successfully"
        )
    except Exception as e:
        db.rollback()
        return APIResponse(success=False, error=str(e))

@router.get("/canvas/{canvas_id}", response_model=APIResponse)
async def get_canvas(canvas_id: int, db: Session = Depends(get_db)):
    """Get a specific canvas layout"""
    try:
        canvas = db.query(BusinessProcessCanvas).filter(
            BusinessProcessCanvas.id == canvas_id,
            BusinessProcessCanvas.is_active == True
        ).first()
        
        if not canvas:
            return APIResponse(success=False, error="Canvas not found")
        
        canvas_data = json.loads(canvas.canvas_data) if canvas.canvas_data else {}
        
        return APIResponse(
            success=True,
            data={
                "id": canvas.id,
                "name": canvas.name,
                "description": canvas.description,
                "version": canvas.version,
                "canvas_data": canvas_data,
                "created_at": canvas.created_at.isoformat() if canvas.created_at else None,
                "updated_at": canvas.updated_at.isoformat() if canvas.updated_at else None
            }
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/canvas", response_model=APIResponse)
async def create_canvas(
    canvas_data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new canvas"""
    try:
        new_canvas = BusinessProcessCanvas(
            name=canvas_data["name"],
            description=canvas_data.get("description"),
            canvas_data=json.dumps(canvas_data.get("canvas_data", {})),
            version=canvas_data.get("version", "1.0"),
            created_by=current_user["id"]
        )
        
        db.add(new_canvas)
        db.commit()
        db.refresh(new_canvas)
        
        return APIResponse(
            success=True,
            data={"canvas_id": new_canvas.id},
            message="Canvas created successfully"
        )
    except Exception as e:
        db.rollback()
        return APIResponse(success=False, error=str(e))

@router.post("/auto-map", response_model=APIResponse)
async def auto_map_processes(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Automatically map TMF processes to existing capabilities"""
    try:
        # Run automatic mapping
        mapping_result = ProcessMappingService.auto_map_processes_to_capabilities(db)
        
        # Propagate vendor scores
        propagation_result = ProcessMappingService.propagate_vendor_scores_to_processes(db)
        
        # Get statistics
        stats = ProcessMappingService.get_mapping_statistics(db)
        
        return APIResponse(
            success=True,
            data={
                "mapping_result": mapping_result,
                "propagation_result": propagation_result,
                "statistics": stats
            },
            message=f"Auto-mapping completed! Created {mapping_result['mappings_created']} mappings, propagated {propagation_result['scores_propagated']} vendor scores."
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/mapping-stats", response_model=APIResponse)
async def get_mapping_statistics(db: Session = Depends(get_db)):
    """Get statistics about current process-capability mappings"""
    try:
        stats = ProcessMappingService.get_mapping_statistics(db)
        return APIResponse(success=True, data=stats)
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/search", response_model=APIResponse)
async def search_processes(
    query: str = "",
    domain: str = "",
    phase: str = "",
    vendor: str = "",
    capability: str = "",
    db: Session = Depends(get_db)
):
    """Search processes with filters"""
    try:
        processes_query = db.query(TMFProcess).filter(TMFProcess.is_active == True)
        
        if query:
            processes_query = processes_query.filter(
                TMFProcess.name.ilike(f"%{query}%") | 
                TMFProcess.description.ilike(f"%{query}%")
            )
        
        if domain:
            processes_query = processes_query.filter(TMFProcess.domain == domain)
        
        if phase:
            processes_query = processes_query.filter(TMFProcess.phase == phase)
        
        if vendor:
            processes_query = processes_query.join(ProcessVendorScore).filter(
                ProcessVendorScore.vendor.ilike(f"%{vendor}%")
            )
        
        if capability:
            processes_query = processes_query.join(ProcessCapabilityMapping).join(
                TMFProcess, ProcessCapabilityMapping.capability_id == TMFProcess.id
            ).filter(TMFProcess.name.ilike(f"%{capability}%"))
        
        processes = processes_query.all()
        
        return APIResponse(
            success=True,
            data={"processes": [p.process_id for p in processes]}
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e)) 