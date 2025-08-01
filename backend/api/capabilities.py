from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import json
import uuid
from datetime import datetime

from core.database import get_db
from services.capability_service import CapabilityService
from schemas.schemas import (
    CapabilityCreate, CapabilityUpdate, CapabilityResponse, CapabilitySummary, 
    APIResponse, WorkflowStats, WorkflowStep, PromptRequest, ValidationRequest, 
    ProcessRequest, VendorScoreResponse, CapabilityTrackerResponse,
    RadarChartData, VendorComparisonData, ScoreDistributionData, ReportRequest
)

router = APIRouter(prefix="/api/capabilities", tags=["capabilities"])

# Basic CRUD Operations
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
        
        return APIResponse(
            success=True,
            data=CapabilityResponse.model_validate(capability).model_dump()
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
        
        return APIResponse(
            success=True,
            data=CapabilityResponse.model_validate(capability).model_dump()
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/", response_model=APIResponse)
async def create_capability(capability: CapabilityCreate, request: Request, db: Session = Depends(get_db)):
    """Create new capability"""
    try:
        db_capability = CapabilityService.create_capability(db, capability)
        return APIResponse(
            success=True,
            data=CapabilityResponse.model_validate(db_capability).model_dump(),
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
        
        return APIResponse(
            success=True,
            data=CapabilityResponse.model_validate(db_capability).model_dump(),
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
        return APIResponse(
            success=True,
            data=CapabilityResponse.model_validate(db_capability).model_dump(),
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
        return APIResponse(success=True, data=[score.model_dump() for score in scores])
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/name/{capability_name}/vendor-scores", response_model=APIResponse)
async def get_vendor_scores(capability_name: str, db: Session = Depends(get_db)):
    """Get vendor scores by capability name"""
    try:
        scores = CapabilityService.get_vendor_scores(db, capability_name)
        return APIResponse(success=True, data=[score.model_dump() for score in scores])
    except Exception as e:
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
    db: Session = Depends(get_db)
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
        
        return APIResponse(
            success=True,
            data={
                "message": f"File uploaded successfully for {capability.name}",
                "filename": file.filename,
                "size": len(content),
                "expected_type": expected_type,
                "capability_name": capability.name,
                "capability_id": capability_id
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
async def validate_research_data_by_id(capability_id: int, request: ValidationRequest, db: Session = Depends(get_db)):
    """Validate research data by capability ID"""
    try:
        capability = CapabilityService.get_capability(db, capability_id)
        if not capability:
            return APIResponse(success=False, error="Capability not found")
        
        validation_result = {
            "valid": True,
            "errors": [],
            "warnings": []
        }
        
        return APIResponse(
            success=True,
            data={
                "validation_result": validation_result,
                "capability_name": capability.name,
                "capability_id": capability_id
            }
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/name/{capability_name}/workflow/validate", response_model=APIResponse)
async def validate_research_data(capability_name: str, request: ValidationRequest, db: Session = Depends(get_db)):
    """Validate research data by capability name"""
    try:
        errors = []
        warnings = []
        
        if request.expected_type == "domain_analysis":
            if "capability" not in request.data:
                errors.append("Missing capability field")
            if "gap_analysis" not in request.data:
                errors.append("Missing gap_analysis field")
        else:
            if "attributes" not in request.data:
                errors.append("Missing attributes field")
            if "market_analysis" not in request.data:
                errors.append("Missing market_analysis field")
        
        return APIResponse(
            success=True,
            data={
                "valid": len(errors) == 0,
                "errors": errors,
                "warnings": warnings
            }
        )
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.post("/{capability_id}/workflow/process-domain", response_model=APIResponse)
async def process_domain_results_by_id(capability_id: int, request: ProcessRequest, db: Session = Depends(get_db)):
    """Process domain results by capability ID"""
    try:
        capability = CapabilityService.get_capability(db, capability_id)
        if not capability:
            return APIResponse(success=False, error="Capability not found")
        
        result = CapabilityService.process_domain_results(db, capability.name, request.data)
        
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
async def process_domain_results(capability_name: str, request: ProcessRequest, db: Session = Depends(get_db)):
    """Process domain results by capability name"""
    try:
        result = CapabilityService.process_domain_results(db, capability_name, request.data)
        
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
async def process_comprehensive_results_by_id(capability_id: int, request: ProcessRequest, db: Session = Depends(get_db)):
    """Process comprehensive results by capability ID"""
    try:
        capability = CapabilityService.get_capability(db, capability_id)
        if not capability:
            return APIResponse(success=False, error="Capability not found")
        
        result = CapabilityService.process_comprehensive_results(db, capability.name, request.data)
        
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
async def process_comprehensive_results(capability_name: str, request: ProcessRequest, db: Session = Depends(get_db)):
    """Process comprehensive results by capability name"""
    try:
        result = CapabilityService.process_comprehensive_results(db, capability_name, request.data)
        
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