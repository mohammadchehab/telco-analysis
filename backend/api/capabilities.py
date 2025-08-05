from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import json
import uuid
from datetime import datetime

from core.database import get_db
from core.auth import get_current_user
from services.capability_service import CapabilityService
from models.models import VendorScore, VendorScoreObservation, ObservationType, Attribute
from schemas.schemas import (
    CapabilityCreate, CapabilityUpdate, CapabilityResponse, CapabilitySummary, 
    APIResponse, WorkflowStats, WorkflowStep, PromptRequest, ValidationRequest, 
    ProcessRequest, VendorScoreResponse, CapabilityTrackerResponse,
    RadarChartData, VendorComparisonData, ScoreDistributionData, ReportRequest
)

router = APIRouter(prefix="/capabilities", tags=["capabilities"])

# Basic CRUD Operations
@router.get("", response_model=APIResponse)
@router.get("/", response_model=APIResponse)
async def get_capabilities(db: Session = Depends(get_db)):
    """Get all capabilities with summary data"""
    try:
        capabilities = CapabilityService.get_capabilities(db)
        stats = CapabilityService.get_workflow_stats(db)
        
        return APIResponse(
            success=True,
            data={
                "capabilities": [cap.model_dump() for cap in capabilities],
                "stats": stats.model_dump()
            }
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/{capability_id}", response_model=APIResponse)
async def get_capability(capability_id: int, db: Session = Depends(get_db)):
    """Get capability by ID"""
    try:
        capability = CapabilityService.get_capability(db, capability_id)
        if not capability:
            return APIResponse(success=False, error="Capability not found")
        
        # Generate version string from version components
        version_string = f"{capability.version_major}.{capability.version_minor}.{capability.version_patch}.{capability.version_build}"
        
        capability_dict = {
            "id": capability.id,
            "name": capability.name,
            "description": capability.description,
            "status": capability.status,
            "created_at": capability.created_at.isoformat() if capability.created_at else None,
            "version_major": capability.version_major,
            "version_minor": capability.version_minor,
            "version_patch": capability.version_patch,
            "version_build": capability.version_build,
            "version_string": version_string
        }
        
        return APIResponse(
            success=True,
            data=capability_dict
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/name/{capability_name}", response_model=APIResponse)
async def get_capability_by_name(capability_name: str, db: Session = Depends(get_db)):
    """Get capability by name"""
    try:
        capability = CapabilityService.get_capability_by_name(db, capability_name)
        if not capability:
            return APIResponse(success=False, error="Capability not found")
        
        capability_dict = {
            "id": capability.id,
            "name": capability.name,
            "description": capability.description,
            "status": capability.status,
            "created_at": capability.created_at.isoformat() if capability.created_at else None
        }
        
        return APIResponse(
            success=True,
            data=capability_dict
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/", response_model=APIResponse)
async def create_capability(capability: CapabilityCreate, request: Request, db: Session = Depends(get_db)):
    """Create new capability"""
    try:
        db_capability = CapabilityService.create_capability(db, capability)
        capability_dict = {
            "id": db_capability.id,
            "name": db_capability.name,
            "description": db_capability.description,
            "status": db_capability.status,
            "created_at": db_capability.created_at.isoformat() if db_capability.created_at else None
        }
        
        return APIResponse(
            success=True,
            data=capability_dict,
            message="Capability created successfully"
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.put("/{capability_id}", response_model=APIResponse)
async def update_capability(capability_id: int, capability: CapabilityUpdate, db: Session = Depends(get_db)):
    """Update capability by ID"""
    try:
        db_capability = CapabilityService.update_capability(db, capability_id, capability)
        if not db_capability:
            return APIResponse(success=False, error="Capability not found")
        
        capability_dict = {
            "id": db_capability.id,
            "name": db_capability.name,
            "description": db_capability.description,
            "status": db_capability.status,
            "created_at": db_capability.created_at.isoformat() if db_capability.created_at else None,
            "version_major": db_capability.version_major,
            "version_minor": db_capability.version_minor,
            "version_patch": db_capability.version_patch,
            "version_build": db_capability.version_build,
            "version_string": f"{db_capability.version_major}.{db_capability.version_minor}.{db_capability.version_patch}.{db_capability.version_build}"
        }
        
        return APIResponse(
            success=True,
            data=capability_dict,
            message="Capability updated successfully"
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.put("/name/{capability_name}", response_model=APIResponse)
async def update_capability_by_name(capability_name: str, capability: CapabilityUpdate, db: Session = Depends(get_db)):
    """Update capability by name"""
    try:
        db_cap = CapabilityService.get_capability_by_name(db, capability_name)
        if not db_cap:
            return APIResponse(success=False, error="Capability not found")
        
        db_capability = CapabilityService.update_capability(db, db_cap.id, capability)
        capability_dict = {
            "id": db_capability.id,
            "name": db_capability.name,
            "description": db_capability.description,
            "status": db_capability.status,
            "created_at": db_capability.created_at.isoformat() if db_capability.created_at else None,
            "version_major": db_capability.version_major,
            "version_minor": db_capability.version_minor,
            "version_patch": db_capability.version_patch,
            "version_build": db_capability.version_build,
            "version_string": f"{db_capability.version_major}.{db_capability.version_minor}.{db_capability.version_patch}.{db_capability.version_build}"
        }
        
        return APIResponse(
            success=True,
            data=capability_dict,
            message="Capability updated successfully"
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.delete("/{capability_id}", response_model=APIResponse)
async def delete_capability(capability_id: int, db: Session = Depends(get_db)):
    """Delete capability by ID"""
    try:
        success = CapabilityService.delete_capability(db, capability_id)
        if not success:
            return APIResponse(success=False, error="Capability not found")
        
        return APIResponse(
            success=True,
            message="Capability deleted successfully"
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.delete("/name/{capability_name}", response_model=APIResponse)
async def delete_capability_by_name(capability_name: str, db: Session = Depends(get_db)):
    """Delete capability by name"""
    try:
        db_cap = CapabilityService.get_capability_by_name(db, capability_name)
        if not db_cap:
            return APIResponse(success=False, error="Capability not found")
        
        success = CapabilityService.delete_capability(db, db_cap.id)
        return APIResponse(
            success=True,
            message=f"Capability '{capability_name}' deleted successfully"
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

# Status Management
@router.get("/{capability_id}/status", response_model=APIResponse)
async def get_capability_status_by_id(capability_id: int, db: Session = Depends(get_db)):
    """Get capability status by ID"""
    try:
        capability = CapabilityService.get_capability(db, capability_id)
        if not capability:
            return APIResponse(success=False, error="Capability not found")
        
        status = CapabilityService.get_capability_status(db, capability.name)
        return APIResponse(success=True, data=status.model_dump())
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/name/{capability_name}/status", response_model=APIResponse)
async def get_capability_status(capability_name: str, db: Session = Depends(get_db)):
    """Get capability status by name"""
    try:
        status = CapabilityService.get_capability_status(db, capability_name)
        return APIResponse(success=True, data=status.model_dump())
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.patch("/{capability_id}/status", response_model=APIResponse)
async def update_capability_status_by_id(capability_id: int, status_update: Dict[str, str], db: Session = Depends(get_db)):
    """Update capability status by ID"""
    try:
        capability = CapabilityService.get_capability(db, capability_id)
        if not capability:
            return APIResponse(success=False, error="Capability not found")
        
        success = CapabilityService.update_capability_status(db, capability.name, status_update.get("status", ""))
        return APIResponse(
            success=True,
            message=f"Capability status updated to {status_update.get('status')}"
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.patch("/name/{capability_name}/status", response_model=APIResponse)
async def update_capability_status(capability_name: str, status_update: Dict[str, str], db: Session = Depends(get_db)):
    """Update capability status by name"""
    try:
        success = CapabilityService.update_capability_status(db, capability_name, status_update.get("status", ""))
        if not success:
            return APIResponse(success=False, error="Capability not found")
        
        return APIResponse(
            success=True,
            message="Status updated successfully"
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

# Vendor Scores
@router.get("/{capability_id}/vendor-scores", response_model=APIResponse)
async def get_vendor_scores_by_id(capability_id: int, db: Session = Depends(get_db)):
    """Get vendor scores by capability ID"""
    try:
        capability = CapabilityService.get_capability(db, capability_id)
        if not capability:
            return APIResponse(success=False, error="Capability not found")
        
        scores = CapabilityService.get_vendor_scores(db, capability.name)
        return APIResponse(success=True, data={"scores": [score.model_dump() for score in scores]})
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/name/{capability_name}/vendor-scores", response_model=APIResponse)
async def get_vendor_scores(capability_name: str, db: Session = Depends(get_db)):
    """Get vendor scores by capability name"""
    try:
        scores = CapabilityService.get_vendor_scores(db, capability_name)
        return APIResponse(success=True, data={"scores": [score.model_dump() for score in scores]})
    except Exception as e:
        return APIResponse(success=False, error=str(e))

# Vendor Score Management - Manual Editing
@router.get("/vendor-scores/lookup", response_model=APIResponse)
async def get_vendor_score_id(
    capability_id: int,
    attribute_name: str,
    vendor: str,
    db: Session = Depends(get_db)
):
    """Get vendor score ID by capability, attribute, and vendor"""
    try:
        print(f"Looking up vendor score: capability_id={capability_id}, attribute_name={attribute_name}, vendor={vendor}")
        
        # Find the attribute first
        attribute = db.query(Attribute).filter(
            Attribute.capability_id == capability_id,
            Attribute.attribute_name == attribute_name
        ).first()
        
        if not attribute:
            print(f"Attribute not found: capability_id={capability_id}, attribute_name={attribute_name}")
            return APIResponse(success=False, error="Attribute not found")
        
        print(f"Found attribute: id={attribute.id}, name={attribute.attribute_name}")
        
        # Find the vendor score
        score = db.query(VendorScore).filter(
            VendorScore.capability_id == capability_id,
            VendorScore.attribute_id == attribute.id,
            VendorScore.vendor == vendor
        ).first()
        
        if not score:
            print(f"Vendor score not found: capability_id={capability_id}, attribute_id={attribute.id}, vendor={vendor}")
            return APIResponse(success=False, error="Vendor score not found")
        
        print(f"Found vendor score: id={score.id}")
        
        return APIResponse(
            success=True,
            data={"score_id": score.id}
        )
    except Exception as e:
        print(f"Exception in get_vendor_score_id: {str(e)}")
        return APIResponse(success=False, error=str(e))

@router.get("/vendor-scores/{score_id}", response_model=APIResponse)
async def get_vendor_score_by_id(score_id: int, db: Session = Depends(get_db)):
    """Get a specific vendor score by ID"""
    try:
        # Join VendorScore with Attribute to get attribute_name and domain_name
        score = db.query(VendorScore, Attribute).join(
            Attribute, VendorScore.attribute_id == Attribute.id
        ).filter(VendorScore.id == score_id).first()
        
        if not score:
            return APIResponse(success=False, error="Vendor score not found")
        
        vendor_score, attribute = score
        
        # Include observations
        observations = db.query(VendorScoreObservation).filter(
            VendorScoreObservation.vendor_score_id == score_id
        ).all()
        
        score_data = {
            "id": vendor_score.id,
            "capability_id": vendor_score.capability_id,
            "attribute_id": vendor_score.attribute_id,
            "attribute_name": attribute.attribute_name,
            "domain_name": attribute.domain_name,
            "attribute_definition": attribute.definition,
            "vendor": vendor_score.vendor,
            "weight": attribute.importance,  # Use weight from Attribute table instead of VendorScore
            "score": vendor_score.score,
            "score_numeric": vendor_score.score_numeric,
            "evidence_url": vendor_score.evidence_url,
            "score_decision": vendor_score.score_decision,
            "research_type": vendor_score.research_type,
            "research_date": vendor_score.research_date,
            "created_at": vendor_score.created_at,
            "observations": [
                {
                    "id": obs.id,
                    "observation": obs.observation,
                    "observation_type": obs.observation_type.value,
                    "created_at": obs.created_at
                } for obs in observations
            ]
        }
        
        return APIResponse(success=True, data=score_data)
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.put("/vendor-scores/{score_id}", response_model=APIResponse)
async def update_vendor_score(
    score_id: int, 
    score_data: Dict[str, Any], 
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a vendor score"""
    try:
        # Check if user has permission to edit
        if current_user.get("role") not in ["admin", "editor"]:
            return APIResponse(success=False, error="Insufficient permissions")
        
        score = db.query(VendorScore).filter(VendorScore.id == score_id).first()
        if not score:
            return APIResponse(success=False, error="Vendor score not found")
        
        # Update score fields (weight comes from Attribute table, not VendorScore)
        if "score" in score_data:
            score.score = score_data["score"]
        if "score_numeric" in score_data:
            score.score_numeric = score_data["score_numeric"]
        if "evidence_url" in score_data:
            score.evidence_url = score_data["evidence_url"]
        if "score_decision" in score_data:
            score.score_decision = score_data["score_decision"]
        if "research_date" in score_data:
            score.research_date = datetime.fromisoformat(score_data["research_date"])
        
        # Update observations if provided
        if "observations" in score_data:
            # Delete existing observations
            db.query(VendorScoreObservation).filter(
                VendorScoreObservation.vendor_score_id == score_id
            ).delete()
            
            # Add new observations
            for obs_data in score_data["observations"]:
                new_obs = VendorScoreObservation(
                    vendor_score_id=score_id,
                    observation=obs_data["observation"],
                    observation_type=ObservationType(obs_data["observation_type"])
                )
                db.add(new_obs)
        
        db.commit()
        
        return APIResponse(
            success=True, 
            data={"message": "Vendor score updated successfully"},
            message="Vendor score updated successfully"
        )
    except Exception as e:
        db.rollback()
        return APIResponse(success=False, error=str(e))

@router.put("/vendor-scores/{score_id}/observations", response_model=APIResponse)
async def update_vendor_score_observations(
    score_id: int, 
    observations_data: Dict[str, Any], 
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update observations for a vendor score"""
    try:
        # Check if user has permission to edit
        if current_user.get("role") not in ["admin", "editor"]:
            return APIResponse(success=False, error="Insufficient permissions")
        
        score = db.query(VendorScore).filter(VendorScore.id == score_id).first()
        if not score:
            return APIResponse(success=False, error="Vendor score not found")
        
        # Delete existing observations
        db.query(VendorScoreObservation).filter(
            VendorScoreObservation.vendor_score_id == score_id
        ).delete()
        
        # Add new observations
        for obs_data in observations_data["observations"]:
            new_obs = VendorScoreObservation(
                vendor_score_id=score_id,
                observation=obs_data["observation"],
                observation_type=ObservationType(obs_data["observation_type"])
            )
            db.add(new_obs)
        
        db.commit()
        
        return APIResponse(
            success=True, 
            data={"message": "Observations updated successfully"},
            message="Observations updated successfully"
        )
    except Exception as e:
        db.rollback()
        return APIResponse(success=False, error=str(e))

@router.put("/vendor-scores/{score_id}/evidence", response_model=APIResponse)
async def update_vendor_score_evidence(
    score_id: int, 
    evidence_data: Dict[str, Any], 
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update evidence URLs for a vendor score"""
    try:
        # Check if user has permission to edit
        if current_user.get("role") not in ["admin", "editor"]:
            return APIResponse(success=False, error="Insufficient permissions")
        
        score = db.query(VendorScore).filter(VendorScore.id == score_id).first()
        if not score:
            return APIResponse(success=False, error="Vendor score not found")
        
        # Update evidence URLs
        if "evidence_urls" in evidence_data:
            score.evidence_url = json.dumps(evidence_data["evidence_urls"])
        
        db.commit()
        
        return APIResponse(
            success=True, 
            data={"message": "Evidence updated successfully"},
            message="Evidence updated successfully"
        )
    except Exception as e:
        db.rollback()
        return APIResponse(success=False, error=str(e))

# Workflow Management
@router.post("/{capability_id}/start-research", response_model=APIResponse)
async def start_research_workflow_by_id(capability_id: int, db: Session = Depends(get_db)):
    """Start research workflow by capability ID"""
    try:
        capability = CapabilityService.get_capability(db, capability_id)
        if not capability:
            return APIResponse(success=False, error="Capability not found")
        
        # Update capability status to 'ready'
        CapabilityService.update_capability_status(db, capability.name, "ready")
        
        return APIResponse(
            success=True,
            data={"message": f"Research workflow started for {capability.name}"}
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/name/{capability_name}/start-research", response_model=APIResponse)
async def start_research_workflow(capability_name: str, db: Session = Depends(get_db)):
    """Start research workflow by capability name"""
    try:
        # Update capability status to 'ready'
        success = CapabilityService.update_capability_status(db, capability_name, "ready")
        if not success:
            return APIResponse(success=False, error="Capability not found")
        
        return APIResponse(
            success=True,
            data={
                "workflow_state": "domain_analysis",
                "prompt_url": f"/api/capabilities/{capability_name}/workflow/generate-prompt",
                "next_steps": [
                    "Generate research prompt",
                    "Upload research results",
                    "Process and analyze data"
                ]
            }
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/{capability_id}/workflow/initialize", response_model=APIResponse)
async def initialize_workflow_by_id(capability_id: int, db: Session = Depends(get_db)):
    """Initialize workflow by capability ID"""
    try:
        capability = CapabilityService.get_capability(db, capability_id)
        if not capability:
            return APIResponse(success=False, error="Capability not found")
        
        workflow_steps = CapabilityService.initialize_workflow()
        
        return APIResponse(
            success=True,
            data={
                "workflow_steps": [step.model_dump() for step in workflow_steps],
                "current_state": "initialized",
                "capability_name": capability.name,
                "capability_id": capability_id
            }
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/name/{capability_name}/workflow/initialize", response_model=APIResponse)
async def initialize_workflow(capability_name: str, db: Session = Depends(get_db)):
    """Initialize workflow by capability name"""
    try:
        workflow_steps = CapabilityService.initialize_workflow()
        
        return APIResponse(
            success=True,
            data={
                "workflow_steps": [step.model_dump() for step in workflow_steps],
                "current_state": "initialized"
            }
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/{capability_id}/workflow/generate-prompt", response_model=APIResponse)
async def generate_prompt_by_id(capability_id: int, request: PromptRequest, db: Session = Depends(get_db)):
    """Generate research prompt by capability ID"""
    try:
        capability = CapabilityService.get_capability(db, capability_id)
        if not capability:
            return APIResponse(success=False, error="Capability not found")
        
        prompt_content = CapabilityService.generate_prompt(capability.name, request.prompt_type, db)
        
        return APIResponse(
            success=True,
            data={
                "prompt_id": str(uuid.uuid4()),
                "prompt_content": prompt_content,
                "capability_name": capability.name,
                "capability_id": capability_id,
                "prompt_type": request.prompt_type,
                "generated_at": datetime.now().isoformat()
            }
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/name/{capability_name}/workflow/generate-prompt", response_model=APIResponse)
async def generate_prompt(capability_name: str, request: PromptRequest, db: Session = Depends(get_db)):
    """Generate research prompt by capability name"""
    try:
        prompt_content = CapabilityService.generate_prompt(capability_name, request.prompt_type, db)
        
        return APIResponse(
            success=True,
            data={
                "prompt_id": str(uuid.uuid4()),
                "prompt_content": prompt_content,
                "capability_name": capability_name,
                "prompt_type": request.prompt_type,
                "generated_at": datetime.now().isoformat()
            }
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/{capability_id}/workflow/upload", response_model=APIResponse)
async def upload_research_file_by_id(
    capability_id: int,
    file: UploadFile = File(...),
    expected_type: str = Form(...),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Upload research file by capability ID"""
    try:
        capability = CapabilityService.get_capability(db, capability_id)
        if not capability:
            return APIResponse(success=False, error="Capability not found")
        
        if not file.filename.endswith('.json'):
            return APIResponse(success=False, error="Only JSON files are supported")
        
        content = await file.read()
        try:
            json_data = json.loads(content.decode('utf-8'))
        except json.JSONDecodeError:
            return APIResponse(success=False, error="Invalid JSON format")
        
        # Store the JSON data in ResearchResult table
        from models.models import ResearchResult
        
        # Map expected_type to research_type
        research_type_mapping = {
            "comprehensive_research": "comprehensive_research",
            "domain_research": "domain_research",
            "comprehensive": "comprehensive_research",
            "domain": "domain_research"
        }
        research_type = research_type_mapping.get(expected_type, expected_type)
        
        # Delete any existing research results for this capability and type
        db.query(ResearchResult).filter(
            ResearchResult.capability_id == capability_id,
            ResearchResult.research_type == research_type
        ).delete()
        
        # Create new research result
        research_result = ResearchResult(
            capability_id=capability_id,
            research_type=research_type,
            result_data=json.dumps(json_data)
        )
        db.add(research_result)
        db.commit()
        
        # Log activity
        from core.auth import log_activity
        log_activity(
            user_id=current_user.get("id"),
            username=current_user.get("username", "unknown"),
            action="uploaded_research_file",
            entity_type="capability",
            entity_id=capability_id,
            entity_name=capability.name,
            details=f"Uploaded {file.filename} ({len(content)} bytes) for {expected_type} research",
            db=db
        )
        
        return APIResponse(
            success=True,
            data={
                "message": f"File uploaded and stored successfully for {capability.name}",
                "filename": file.filename,
                "size": len(content),
                "expected_type": expected_type,
                "capability_name": capability.name,
                "capability_id": capability_id,
                "stored": True
            }
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/name/{capability_name}/workflow/upload", response_model=APIResponse)
async def upload_research_file(
    capability_name: str,
    file: UploadFile = File(...),
    expected_type: str = Form(...),
    db: Session = Depends(get_db)
):
    """Upload research file by capability name"""
    try:
        if not file.filename.endswith('.json'):
            return APIResponse(success=False, error="Only JSON files are supported")
        
        content = await file.read()
        try:
            json_data = json.loads(content.decode('utf-8'))
        except json.JSONDecodeError:
            return APIResponse(success=False, error="Invalid JSON format")
        
        return APIResponse(
            success=True,
            data={
                "filename": file.filename,
                "file_size": len(content),
                "json_data": json_data,
                "expected_type": expected_type,
                "validation_passed": True
            }
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/{capability_id}/workflow/validate", response_model=APIResponse)
async def validate_research_data_by_id(capability_id: int, request: Dict[str, Any], db: Session = Depends(get_db)):
    """Validate research data by capability ID"""
    try:
        capability = CapabilityService.get_capability(db, capability_id)
        if not capability:
            return APIResponse(success=False, error="Capability not found")
        
        errors = []
        warnings = []
        
        # Check if it's the old format (wrapped in data) or new format (direct)
        if "data" in request and "expected_type" in request:
            # Old format - extract data
            data = request["data"]
            expected_type = request["expected_type"]
        else:
            # New format - use request directly
            data = request
            # Auto-detect the type based on content
            if "attributes" in data and "market_analysis" in data:
                expected_type = "comprehensive_research"
            elif "enhanced_framework" in data or "gap_analysis" in data:
                expected_type = "domain_analysis"
            else:
                expected_type = "domain_analysis"  # Default fallback
        
        if expected_type == "domain_analysis":
            if "capability" not in data:
                errors.append("Missing capability field")
            if "enhanced_framework" not in data and "gap_analysis" not in data:
                errors.append("Missing enhanced_framework or gap_analysis field")
        else:  # comprehensive_research
            if "attributes" not in data:
                errors.append("Missing attributes field")
            if "market_analysis" not in data:
                errors.append("Missing market_analysis field")
        
        return APIResponse(
            success=True,
            data={
                "validation_result": {
                    "valid": len(errors) == 0,
                    "errors": errors,
                    "warnings": warnings
                },
                "capability_name": capability.name,
                "capability_id": capability_id
            }
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/name/{capability_name}/workflow/validate", response_model=APIResponse)
async def validate_research_data(capability_name: str, request: Dict[str, Any], db: Session = Depends(get_db)):
    """Validate research data by capability name"""
    try:
        errors = []
        warnings = []
        
        # Check if it's the old format (wrapped in data) or new format (direct)
        if "data" in request and "expected_type" in request:
            # Old format - extract data
            data = request["data"]
            expected_type = request["expected_type"]
        else:
            # New format - use request directly
            data = request
            # Auto-detect the type based on content
            if "attributes" in data and "market_analysis" in data:
                expected_type = "comprehensive_research"
            elif "enhanced_framework" in data or "gap_analysis" in data:
                expected_type = "domain_analysis"
            else:
                expected_type = "domain_analysis"  # Default fallback
        
        if expected_type == "domain_analysis":
            if "capability" not in data:
                errors.append("Missing capability field")
            if "enhanced_framework" not in data and "gap_analysis" not in data:
                errors.append("Missing enhanced_framework or gap_analysis field")
        else:  # comprehensive_research
            if "attributes" not in data:
                errors.append("Missing attributes field")
            if "market_analysis" not in data:
                errors.append("Missing market_analysis field")
        
        return APIResponse(
            success=True,
            data={
                "validation_result": {
                    "valid": len(errors) == 0,
                    "errors": errors,
                    "warnings": warnings
                },
                "capability_name": capability_name
            }
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/{capability_id}/workflow/process-domain", response_model=APIResponse)
async def process_domain_results_by_id(
    capability_id: int, 
    request: Dict[str, Any], 
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process domain results by capability ID"""
    try:
        capability = CapabilityService.get_capability(db, capability_id)
        if not capability:
            return APIResponse(success=False, error="Capability not found")
        
        # Try to get stored research data first
        from models.models import ResearchResult
        stored_data = db.query(ResearchResult).filter(
            ResearchResult.capability_id == capability_id,
            ResearchResult.research_type == "domain_research"
        ).first()
        
        if stored_data:
            # Use stored data
            data = json.loads(stored_data.result_data)
        else:
            # Fall back to request data
            if "data" in request:
                # Old format - extract data
                data = request["data"]
            else:
                # New format - use request directly
                data = request
        
        result = CapabilityService.process_domain_results(db, capability.name, data, current_user.get("id"))
        
        return APIResponse(
            success=True,
            data={
                "message": f"Domain results processed for {capability.name}",
                **result,
                "capability_name": capability.name,
                "capability_id": capability_id
            }
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/name/{capability_name}/workflow/process-domain", response_model=APIResponse)
async def process_domain_results(
    capability_name: str, 
    request: Dict[str, Any], 
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process domain results by capability name"""
    try:
        # Check if it's the old format (wrapped in data) or new format (direct)
        if "data" in request:
            # Old format - extract data
            data = request["data"]
        else:
            # New format - use request directly
            data = request
        
        result = CapabilityService.process_domain_results(db, capability_name, data, current_user.get("id"))
        
        return APIResponse(
            success=True,
            data={
                "success": True,
                **result
            }
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/{capability_id}/workflow/process-comprehensive", response_model=APIResponse)
async def process_comprehensive_results_by_id(
    capability_id: int, 
    request: Dict[str, Any], 
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process comprehensive results by capability ID"""
    try:
        capability = CapabilityService.get_capability(db, capability_id)
        if not capability:
            return APIResponse(success=False, error="Capability not found")
        
        # Try to get stored research data first
        from models.models import ResearchResult
        stored_data = db.query(ResearchResult).filter(
            ResearchResult.capability_id == capability_id,
            ResearchResult.research_type == "comprehensive_research"
        ).first()
        
        if stored_data:
            # Use stored data
            data = json.loads(stored_data.result_data)
        else:
            # Fall back to request data
            if "data" in request:
                data = request["data"]
            else:
                data = request
        
        result = CapabilityService.process_comprehensive_results(db, capability.name, data, current_user.get("id"))
        
        # Log activity
        from core.auth import log_activity
        log_activity(
            user_id=current_user.get("id"),
            username=current_user.get("username", "unknown"),
            action="processed_comprehensive_results",
            entity_type="capability",
            entity_id=capability_id,
            entity_name=capability.name,
            details=f"Processed comprehensive results: {result.get('processed_vendors', 0)} vendors, {result.get('created_attributes', 0)} attributes",
            db=db
        )
        
        return APIResponse(
            success=True,
            data={
                "message": f"Comprehensive results processed for {capability.name}",
                **result,
                "capability_name": capability.name,
                "capability_id": capability_id
            }
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/name/{capability_name}/workflow/process-comprehensive", response_model=APIResponse)
async def process_comprehensive_results(
    capability_name: str, 
    request: Dict[str, Any], 
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process comprehensive results by capability name"""
    try:
        # Check if it's the old format (wrapped in data) or new format (direct)
        if "data" in request:
            # Old format - extract data
            data = request["data"]
        else:
            # New format - use request directly
            data = request
        
        result = CapabilityService.process_comprehensive_results(db, capability_name, data, current_user.get("id"))
        
        return APIResponse(
            success=True,
            data={
                "success": True,
                **result
            }
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

# Report Generation
@router.post("/reports/generate", response_model=APIResponse)
async def generate_report(request: ReportRequest, db: Session = Depends(get_db)):
    """Generate reports"""
    try:
        capability = CapabilityService.get_capability(db, request.capability_id)
        if not capability:
            return APIResponse(success=False, error="Capability not found")
        
        if request.report_type == "radar_chart":
            data = CapabilityService.generate_radar_chart_data(db, request.capability_id)
        elif request.report_type == "vendor_comparison":
            data = CapabilityService.generate_vendor_comparison_data(db, request.capability_id)
        elif request.report_type == "score_distribution":
            data = CapabilityService.generate_score_distribution_data(db, request.capability_id)
        elif request.report_type == "comprehensive":
            radar_data = CapabilityService.generate_radar_chart_data(db, request.capability_id)
            vendor_data = CapabilityService.generate_vendor_comparison_data(db, request.capability_id)
            distribution_data = CapabilityService.generate_score_distribution_data(db, request.capability_id)
            data = {
                "radar_chart": radar_data.model_dump(),
                "vendor_comparison": vendor_data.model_dump(),
                "score_distribution": distribution_data.model_dump()
            }
        else:
            return APIResponse(success=False, error="Invalid report type")
        
        return APIResponse(
            success=True,
            data={
                "report_type": request.report_type,
                "capability_id": request.capability_id,
                "data": data.model_dump() if hasattr(data, 'model_dump') else data,
                "generated_at": datetime.now().isoformat()
            }
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/reports/{capability_id}/radar-chart", response_model=APIResponse)
async def get_radar_chart_data(capability_id: int, db: Session = Depends(get_db)):
    """Get radar chart data"""
    try:
        data = CapabilityService.generate_radar_chart_data(db, capability_id)
        return APIResponse(success=True, data=data.model_dump())
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/reports/{capability_id}/vendor-comparison", response_model=APIResponse)
async def get_vendor_comparison_data(capability_id: int, db: Session = Depends(get_db)):
    """Get vendor comparison data"""
    try:
        data = CapabilityService.generate_vendor_comparison_data(db, capability_id)
        return APIResponse(success=True, data=data.model_dump())
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/reports/{capability_id}/score-distribution", response_model=APIResponse)
async def get_score_distribution_data(capability_id: int, db: Session = Depends(get_db)):
    """Get score distribution data"""
    try:
        data = CapabilityService.generate_score_distribution_data(db, capability_id)
        return APIResponse(success=True, data=data.model_dump())
    except Exception as e:
        return APIResponse(success=False, error=str(e)) 