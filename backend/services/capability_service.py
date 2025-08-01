from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import uuid
from models.models import Capability, Domain, Attribute, VendorScore, CapabilityTracker
from schemas.schemas import (
    CapabilityCreate, CapabilityUpdate, CapabilityResponse, CapabilitySummary, 
    WorkflowStats, WorkflowStep, PromptRequest, ProcessRequest, VendorScoreResponse,
    CapabilityTrackerResponse, RadarChartData, VendorComparisonData, ScoreDistributionData
)
from templates.prompts import get_prompt_template

class CapabilityService:
    
    @staticmethod
    def load_capability_data(capability_name: str, db: Session) -> dict:
        """Load capability data from database for domain analysis"""
        try:
            # Get capability info
            capability = db.query(Capability).filter(Capability.name == capability_name).first()
            
            if not capability:
                # New capability - return empty structure
                return {
                    "exists": False,
                    "domains": [],
                    "attributes": [],
                    "domain_count": 0,
                    "attribute_count": 0
                }
            
            # Get domains
            domains = db.query(Domain).filter(Domain.capability_id == capability.id).all()
            domain_names = [domain.domain_name for domain in domains]
            
            # Get attributes
            attributes = db.query(Attribute).filter(Attribute.capability_id == capability.id).order_by(Attribute.domain_name, Attribute.attribute_name).all()
            attributes_data = []
            for attr in attributes:
                attributes_data.append({
                    "domain": attr.domain_name,
                    "attribute_name": attr.attribute_name,
                    "definition": attr.definition,
                    "tm_forum_mapping": attr.tm_forum_mapping,
                    "importance": attr.importance
                })
            
            return {
                "exists": True,
                "capability_id": capability.id,
                "name": capability.name,
                "status": capability.status,
                "domains": domain_names,
                "attributes": attributes_data,
                "domain_count": len(domain_names),
                "attribute_count": len(attributes_data)
            }
            
        except Exception as e:
            raise ValueError(f"Error loading capability data: {str(e)}")
    
    @staticmethod
    def get_capabilities(db: Session) -> List[CapabilitySummary]:
        """Get all capabilities with summary data"""
        # Using raw SQL for complex joins and aggregations
        query = text("""
            SELECT 
                c.id, c.name, c.status, c.created_at,
                COUNT(DISTINCT d.domain_name) as domains_count,
                COUNT(DISTINCT a.attribute_name) as attributes_count,
                COALESCE(ct.last_updated, c.created_at) as last_updated
            FROM capabilities c
            LEFT JOIN domains d ON c.id = d.capability_id
            LEFT JOIN attributes a ON c.id = a.capability_id
            LEFT JOIN capability_tracker ct ON c.name = ct.capability_name
            GROUP BY c.id, c.name, c.status, c.created_at
            ORDER BY c.name
        """)
        
        result = db.execute(query)
        capabilities = []
        
        for row in result:
            capabilities.append(CapabilitySummary(
                id=row.id,
                name=row.name,
                status=row.status,
                domains_count=row.domains_count,
                attributes_count=row.attributes_count,
                last_updated=row.last_updated
            ))
        
        return capabilities
    
    @staticmethod
    def get_capability(db: Session, capability_id: int) -> Optional[Capability]:
        """Get capability by ID"""
        return db.query(Capability).filter(Capability.id == capability_id).first()
    
    @staticmethod
    def get_capability_by_name(db: Session, capability_name: str) -> Optional[Capability]:
        """Get capability by name"""
        return db.query(Capability).filter(Capability.name == capability_name).first()
    
    @staticmethod
    def create_capability(db: Session, capability: CapabilityCreate) -> Capability:
        """Create new capability"""
        db_capability = Capability(
            name=capability.name,
            description=capability.description,
            status=capability.status,
            created_at=datetime.now().isoformat()
        )
        db.add(db_capability)
        db.commit()
        db.refresh(db_capability)
        return db_capability
    
    @staticmethod
    def update_capability(db: Session, capability_id: int, capability: CapabilityUpdate) -> Optional[Capability]:
        """Update capability"""
        db_capability = db.query(Capability).filter(Capability.id == capability_id).first()
        if not db_capability:
            return None
        
        if capability.name is not None:
            db_capability.name = capability.name
        if capability.description is not None:
            db_capability.description = capability.description
        if capability.status is not None:
            db_capability.status = capability.status
        
        db.commit()
        db.refresh(db_capability)
        return db_capability
    
    @staticmethod
    def delete_capability(db: Session, capability_id: int) -> bool:
        """Delete capability"""
        db_capability = db.query(Capability).filter(Capability.id == capability_id).first()
        if not db_capability:
            return False
        
        db.delete(db_capability)
        db.commit()
        return True
    
    @staticmethod
    def get_workflow_stats(db: Session) -> WorkflowStats:
        """Calculate workflow statistics"""
        query = text("SELECT status, COUNT(*) as count FROM capabilities GROUP BY status")
        result = db.execute(query)
        status_counts = dict(result.fetchall())
        
        return WorkflowStats(
            total=sum(status_counts.values()),
            readyForResearch=status_counts.get('ready', 0),
            reviewRequired=status_counts.get('review', 0),
            domainAnalysis=status_counts.get('new', 0),
            completed=status_counts.get('completed', 0)
        )
    
    @staticmethod
    def get_capability_status(db: Session, capability_name: str) -> Optional[CapabilityTrackerResponse]:
        """Get capability tracker status"""
        tracker = db.query(CapabilityTracker).filter(CapabilityTracker.capability_name == capability_name).first()
        
        if not tracker:
            # Create tracker entry if it doesn't exist
            tracker = CapabilityTracker(
                capability_name=capability_name,
                review_completed=False,
                comprehensive_ready=False,
                last_updated=datetime.now().isoformat(),
                notes=None
            )
            db.add(tracker)
            db.commit()
            db.refresh(tracker)
        
        return CapabilityTrackerResponse(
            capability_name=tracker.capability_name,
            review_completed=tracker.review_completed,
            comprehensive_ready=tracker.comprehensive_ready,
            last_updated=tracker.last_updated,
            notes=tracker.notes
        )
    
    @staticmethod
    def update_capability_status(db: Session, capability_name: str, status: str) -> bool:
        """Update capability status"""
        capability = db.query(Capability).filter(Capability.name == capability_name).first()
        if not capability:
            return False
        
        capability.status = status
        db.commit()
        return True
    
    @staticmethod
    def get_vendor_scores(db: Session, capability_name: str) -> List[VendorScoreResponse]:
        """Get vendor scores for a capability"""
        capability = db.query(Capability).filter(Capability.name == capability_name).first()
        if not capability:
            return []
        
        scores = db.query(VendorScore).filter(VendorScore.capability_id == capability.id).all()
        
        return [
            VendorScoreResponse(
                id=score.id,
                capability_id=score.capability_id,
                attribute_name=score.attribute_name,
                vendor=score.vendor,
                weight=score.weight,
                score=score.score,
                score_numeric=score.score_numeric,
                observation=score.observation,
                evidence_url=score.evidence_url,
                score_decision=score.score_decision,
                research_type=score.research_type,
                research_date=score.research_date,
                created_at=score.created_at
            )
            for score in scores
        ]
    
    @staticmethod
    def initialize_workflow() -> List[WorkflowStep]:
        """Initialize workflow steps"""
        return [
            WorkflowStep(
                id="step-1",
                name="Generate Research Prompt",
                description="Generate appropriate research prompt based on capability state",
                status="pending",
                order=1,
                action="generate_prompt"
            ),
            WorkflowStep(
                id="step-2",
                name="Upload Research Results",
                description="Upload and validate research results JSON file",
                status="pending",
                order=2,
                action="upload_results"
            ),
            WorkflowStep(
                id="step-3",
                name="Process Results",
                description="Process uploaded results and update database",
                status="pending",
                order=3,
                action="process_results"
            )
        ]
    
    @staticmethod
    def generate_prompt(capability_name: str, prompt_type: str, db: Session) -> str:
        """Generate research prompt based on type using templates"""
        if prompt_type == "domain_analysis":
            # Load capability data to determine if it's new or existing
            capability_data = CapabilityService.load_capability_data(capability_name, db)
            return get_prompt_template(prompt_type, capability_name, capability_data)
        else:
            return get_prompt_template(prompt_type, capability_name)
    
    @staticmethod
    def process_domain_results(db: Session, capability_name: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process domain analysis results"""
        capability = db.query(Capability).filter(Capability.name == capability_name).first()
        if not capability:
            return {"error": "Capability not found"}
        
        processed_domains = 0
        
        if "proposed_framework" in data and "domains" in data["proposed_framework"]:
            for domain_data in data["proposed_framework"]["domains"]:
                domain_name = domain_data["domain_name"]
                
                # Create domain
                domain = Domain(
                    capability_id=capability.id,
                    domain_name=domain_name
                )
                db.add(domain)
                db.flush()  # Get domain ID
                
                # Create attributes
                for attr_data in domain_data.get("attributes", []):
                    attribute = Attribute(
                        capability_id=capability.id,
                        domain_name=domain_name,
                        attribute_name=attr_data["attribute_name"],
                        definition=attr_data.get("definition", ""),
                        tm_forum_mapping=attr_data.get("tm_forum_mapping", ""),
                        importance=attr_data.get("importance", "medium")
                    )
                    db.add(attribute)
                
                processed_domains += 1
        
        # Update capability tracker
        tracker = db.query(CapabilityTracker).filter(CapabilityTracker.capability_name == capability_name).first()
        if tracker:
            tracker.review_completed = True
            tracker.last_updated = datetime.now().isoformat()
        else:
            tracker = CapabilityTracker(
                capability_name=capability_name,
                review_completed=True,
                comprehensive_ready=False,
                last_updated=datetime.now().isoformat()
            )
            db.add(tracker)
        
        # Update capability status
        capability.status = "ready"
        
        db.commit()
        
        return {
            "processed_domains": processed_domains,
            "capability_name": capability_name,
            "next_workflow_step": "comprehensive_research"
        }
    
    @staticmethod
    def process_comprehensive_results(db: Session, capability_name: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process comprehensive research results"""
        capability = db.query(Capability).filter(Capability.name == capability_name).first()
        if not capability:
            return {"error": "Capability not found"}
        
        processed_vendors = 0
        
        if "attributes" in data:
            for attr_data in data["attributes"]:
                attribute_name = attr_data.get("attribute")
                weight = attr_data.get("weight", 50)
                
                # Process vendor scores
                for vendor in ["comarch", "servicenow", "salesforce"]:
                    if vendor in attr_data:
                        vendor_data = attr_data[vendor]
                        
                        # Create vendor score
                        score = VendorScore(
                            capability_id=capability.id,
                            attribute_name=attribute_name,
                            vendor=vendor,
                            weight=weight,
                            score=vendor_data.get("score", ""),
                            score_numeric=int(vendor_data.get("score", "0").split()[0]) if vendor_data.get("score") else 0,
                            observation=json.dumps(vendor_data.get("observation", [])),
                            evidence_url=json.dumps(vendor_data.get("evidence", [])),
                            score_decision=vendor_data.get("score_decision", ""),
                            research_type="capability_research",
                            research_date=data.get("research_date", datetime.now().isoformat()),
                            created_at=datetime.now().isoformat()
                        )
                        db.add(score)
                        processed_vendors += 1
        
        # Update capability tracker
        tracker = db.query(CapabilityTracker).filter(CapabilityTracker.capability_name == capability_name).first()
        if tracker:
            tracker.comprehensive_ready = True
            tracker.last_updated = datetime.now().isoformat()
        else:
            tracker = CapabilityTracker(
                capability_name=capability_name,
                review_completed=True,
                comprehensive_ready=True,
                last_updated=datetime.now().isoformat()
            )
            db.add(tracker)
        
        # Update capability status
        capability.status = "completed"
        
        db.commit()
        
        return {
            "processed_vendors": processed_vendors,
            "capability_name": capability_name,
            "analysis_ready": True
        }
    
    @staticmethod
    def generate_radar_chart_data(db: Session, capability_id: int) -> RadarChartData:
        """Generate radar chart data for a capability"""
        capability = db.query(Capability).filter(Capability.id == capability_id).first()
        if not capability:
            raise ValueError("Capability not found")
        
        # Get all attributes for this capability
        attributes = db.query(Attribute).filter(Attribute.capability_id == capability_id).all()
        attribute_names = [attr.attribute_name for attr in attributes]
        
        # Get vendor scores
        vendors = ["comarch", "servicenow", "salesforce"]
        scores = []
        
        for vendor in vendors:
            vendor_scores = []
            for attr in attributes:
                score = db.query(VendorScore).filter(
                    VendorScore.capability_id == capability_id,
                    VendorScore.attribute_name == attr.attribute_name,
                    VendorScore.vendor == vendor
                ).order_by(VendorScore.created_at.desc()).first()
                
                vendor_scores.append(float(score.score_numeric) if score else 0.0)
            scores.append(vendor_scores)
        
        return RadarChartData(
            capability_name=capability.name,
            vendors=vendors,
            attributes=attribute_names,
            scores=scores
        )
    
    @staticmethod
    def generate_vendor_comparison_data(db: Session, capability_id: int) -> VendorComparisonData:
        """Generate vendor comparison data for a capability"""
        capability = db.query(Capability).filter(Capability.id == capability_id).first()
        if not capability:
            raise ValueError("Capability not found")
        
        # Get all attributes with weights
        attributes = db.query(Attribute).filter(Attribute.capability_id == capability_id).all()
        attribute_names = [attr.attribute_name for attr in attributes]
        weights = [int(attr.importance) if attr.importance else 50 for attr in attributes]
        
        # Get vendor scores
        vendors = ["comarch", "servicenow", "salesforce"]
        scores = {}
        
        for vendor in vendors:
            vendor_scores = []
            for attr in attributes:
                score = db.query(VendorScore).filter(
                    VendorScore.capability_id == capability_id,
                    VendorScore.attribute_name == attr.attribute_name,
                    VendorScore.vendor == vendor
                ).order_by(VendorScore.created_at.desc()).first()
                
                vendor_scores.append(float(score.score_numeric) if score else 0.0)
            scores[vendor] = vendor_scores
        
        return VendorComparisonData(
            capability_name=capability.name,
            vendors=vendors,
            attributes=attribute_names,
            scores=scores,
            weights=weights
        )
    
    @staticmethod
    def generate_score_distribution_data(db: Session, capability_id: int) -> ScoreDistributionData:
        """Generate score distribution data for a capability"""
        capability = db.query(Capability).filter(Capability.id == capability_id).first()
        if not capability:
            raise ValueError("Capability not found")
        
        # Get all vendor scores
        scores_data = db.query(VendorScore).filter(VendorScore.capability_id == capability_id).all()
        
        # Define score ranges
        score_ranges = ["1-2", "2-3", "3-4", "4-5"]
        vendors = ["comarch", "servicenow", "salesforce"]
        vendor_counts = {vendor: [0, 0, 0, 0] for vendor in vendors}
        
        # Count scores in each range
        for score in scores_data:
            if score.vendor in vendor_counts:
                score_val = score.score_numeric
                if 1 <= score_val <= 2:
                    vendor_counts[score.vendor][0] += 1
                elif 2 < score_val <= 3:
                    vendor_counts[score.vendor][1] += 1
                elif 3 < score_val <= 4:
                    vendor_counts[score.vendor][2] += 1
                elif 4 < score_val <= 5:
                    vendor_counts[score.vendor][3] += 1
        
        return ScoreDistributionData(
            capability_name=capability.name,
            score_ranges=score_ranges,
            vendor_counts=vendor_counts
        ) 