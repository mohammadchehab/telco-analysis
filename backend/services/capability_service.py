from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
import hashlib
import json
from models.models import Capability, Domain, Attribute, VendorScore, VendorScoreObservation, ResearchResult, User, ActivityLog, CapabilityTracker, Vendor
from schemas.schemas import CapabilityCreate, CapabilityUpdate, CapabilitySummary, WorkflowStats, CapabilityTrackerResponse, VendorScoreResponse, RadarChartData, VendorComparisonData, ScoreDistributionData, WorkflowStep
from templates.prompts import get_prompt_template
from utils.version_manager import VersionManager

class CapabilityService:
    
    @staticmethod
    def get_active_vendors(db: Session) -> List[str]:
        """Get list of active vendor names"""
        vendors = db.query(Vendor).filter(Vendor.is_active == True).all()
        return [vendor.name for vendor in vendors]
    
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
            
            # Check if capability has any domains or attributes
            has_framework = len(domain_names) > 0 or len(attributes_data) > 0
            
            return {
                "exists": has_framework,  # Only exists if it has a framework
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
                c.version_major, c.version_minor, c.version_patch, c.version_build,
                COUNT(DISTINCT d.domain_name) as domains_count,
                COUNT(DISTINCT a.attribute_name) as attributes_count,
                COALESCE(ct.last_updated, c.created_at) as last_updated
            FROM capabilities c
            LEFT JOIN domains d ON c.id = d.capability_id
            LEFT JOIN attributes a ON c.id = a.capability_id
            LEFT JOIN capability_tracker ct ON c.name = ct.capability_name
            GROUP BY c.id, c.name, c.status, c.created_at, c.version_major, c.version_minor, c.version_patch, c.version_build, ct.last_updated
            ORDER BY c.name
        """)
        
        result = db.execute(query)
        capabilities = []
        
        for row in result:
            # Generate version string from version components
            version_string = f"{row.version_major}.{row.version_minor}.{row.version_patch}.{row.version_build}"
            
            capabilities.append(CapabilitySummary(
                id=row.id,
                name=row.name,
                status=row.status,
                domains_count=row.domains_count,
                attributes_count=row.attributes_count,
                last_updated=row.last_updated,
                version_string=version_string
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
        # Check if capability with this name already exists
        existing_capability = db.query(Capability).filter(Capability.name == capability.name).first()
        if existing_capability:
            raise ValueError(f"Capability with name '{capability.name}' already exists")
        
        db_capability = Capability(
            name=capability.name,
            description=capability.description,
            status=capability.status,
            created_at=datetime.now()
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
        
        # Update version fields if provided
        if capability.version_major is not None:
            db_capability.version_major = capability.version_major
        if capability.version_minor is not None:
            db_capability.version_minor = capability.version_minor
        if capability.version_patch is not None:
            db_capability.version_patch = capability.version_patch
        if capability.version_build is not None:
            db_capability.version_build = capability.version_build
        
        db.commit()
        db.refresh(db_capability)
        return db_capability
    
    @staticmethod
    def delete_capability(db: Session, capability_id: int) -> bool:
        """Hard delete capability and all related records"""
        db_capability = db.query(Capability).filter(Capability.id == capability_id).first()
        if not db_capability:
            return False
        
        try:
            # Delete related records first (in reverse order of dependencies)
            
            # Delete vendor scores
            db.query(VendorScore).filter(VendorScore.capability_id == capability_id).delete()
            
            # Delete research results
            db.query(ResearchResult).filter(ResearchResult.capability_id == capability_id).delete()
            
            # Delete attributes
            db.query(Attribute).filter(Attribute.capability_id == capability_id).delete()
            
            # Delete domains
            db.query(Domain).filter(Domain.capability_id == capability_id).delete()
            
            # Delete capability tracker
            db.query(CapabilityTracker).filter(CapabilityTracker.capability_name == db_capability.name).delete()
            
            # Finally delete the capability
            db.delete(db_capability)
            db.commit()
            return True
            
        except Exception as e:
            db.rollback()
            print(f"Error deleting capability {capability_id}: {e}")
            return False
    
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
                last_updated=datetime.now(),
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
        
        # Only return scores if capability is completed
        if capability.status != "completed":
            return []
        
        scores = db.query(VendorScore).filter(VendorScore.capability_id == capability.id).all()
        
        from schemas.schemas import VendorScoreObservationResponse
        
        result = []
        for score in scores:
            # Get observations for this score
            observations = db.query(VendorScoreObservation).filter(
                VendorScoreObservation.vendor_score_id == score.id
            ).all()
            
            observation_responses = [
                VendorScoreObservationResponse(
                    id=obs.id,
                    vendor_score_id=obs.vendor_score_id,
                    observation=obs.observation,
                    observation_type=obs.observation_type.value,
                    created_at=obs.created_at
                )
                for obs in observations
            ]
            
            result.append(VendorScoreResponse(
                id=score.id,
                capability_id=score.capability_id,
                attribute_name=score.attribute.attribute_name if score.attribute else "Unknown",
                vendor=score.vendor,
                weight=score.weight,
                score=score.score,
                score_numeric=score.score_numeric,
                evidence_url=score.evidence_url,
                score_decision=score.score_decision,
                research_type=score.research_type,
                research_date=score.research_date,
                created_at=score.created_at,
                observations=observation_responses
            ))
        
        return result
    
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
        # Load capability data to determine if it's new or existing
        capability_data = CapabilityService.load_capability_data(capability_name, db)
        # Get active vendors for dynamic prompt generation
        vendors = CapabilityService.get_active_vendors(db)
        return get_prompt_template(prompt_type, capability_name, capability_data, vendors)
    
    @staticmethod
    def process_domain_results(db: Session, capability_name: str, data: Dict[str, Any], user_id: int = None) -> Dict[str, Any]:
        """Process domain analysis results"""
        capability = db.query(Capability).filter(Capability.name == capability_name).first()
        if not capability:
            return {"error": "Capability not found"}
        
        processed_domains = 0
        skipped_domains = 0
        
        # Handle enhanced_framework, gap_analysis, and proposed_framework formats
        domains_data = []
        
        # Check for enhanced_framework format (old format)
        if "enhanced_framework" in data and "domains" in data["enhanced_framework"]:
            domains_data = data["enhanced_framework"]["domains"]
        # Check for gap_analysis format (new format)
        elif "gap_analysis" in data and "missing_domains" in data["gap_analysis"]:
            # Convert gap_analysis format to the expected format
            for domain_info in data["gap_analysis"]["missing_domains"]:
                domain_data = {
                    "domain_name": domain_info["domain_name"],
                    "description": domain_info.get("description", ""),
                    "importance": domain_info.get("importance", "medium"),
                    "attributes": []
                }
                
                # Find attributes for this domain
                if "missing_attributes" in data["gap_analysis"]:
                    for attr_info in data["gap_analysis"]["missing_attributes"]:
                        if attr_info.get("domain") == domain_info["domain_name"]:
                            domain_data["attributes"].append({
                                "attribute_name": attr_info["attribute_name"],
                                "definition": attr_info.get("description", ""),
                                "tm_forum_mapping": "",
                                "importance": attr_info.get("importance", "50")
                            })
                
                domains_data.append(domain_data)
        # Check for proposed_framework format (like sample.json)
        elif "proposed_framework" in data and "domains" in data["proposed_framework"]:
            domains_data = data["proposed_framework"]["domains"]
        
        # Process domains
        for domain_data in domains_data:
            domain_name = domain_data["domain_name"]
            
            # Check if domain already exists
            existing_domain = db.query(Domain).filter(
                Domain.capability_id == capability.id,
                Domain.domain_name == domain_name
            ).first()
            
            if existing_domain:
                skipped_domains += 1
                continue
            
            # Create domain with new fields
            domain = Domain(
                capability_id=capability.id,
                domain_name=domain_name,
                description=domain_data.get("description", ""),
                importance=domain_data.get("importance", "medium"),
                content_hash=VersionManager.generate_domain_hash(domain_data),
                version="1.0",
                import_batch=None,
                import_date=datetime.now(),
                is_active=True
            )
            db.add(domain)
            db.flush()  # Get domain ID
            
            # Create attributes
            for attr_data in domain_data.get("attributes", []):
                attribute_name = attr_data["attribute_name"]
                
                # Check if attribute already exists
                existing_attribute = db.query(Attribute).filter(
                    Attribute.capability_id == capability.id,
                    Attribute.domain_name == domain_name,
                    Attribute.attribute_name == attribute_name
                ).first()
                
                if not existing_attribute:
                    # Generate content hash for the attribute
                    attr_hash_data = {
                        'domain_name': domain_name,
                        'attribute_name': attribute_name,
                        'definition': attr_data.get("definition", ""),
                        'tm_forum_mapping': attr_data.get("tm_forum_mapping", ""),
                        'importance': attr_data.get("importance", "medium")
                    }
                    content_hash = VersionManager.generate_attribute_hash(attr_hash_data)
                    
                    attribute = Attribute(
                        capability_id=capability.id,
                        domain_name=domain_name,
                        attribute_name=attribute_name,
                        definition=attr_data.get("definition", ""),
                        tm_forum_mapping=attr_data.get("tm_forum_mapping", ""),
                        importance=attr_data.get("importance", "medium"),
                        content_hash=content_hash,
                        version=VersionManager.get_version_string(capability),
                        import_batch=None,
                        import_date=datetime.now(),
                        is_active=True
                    )
                    db.add(attribute)
            
            processed_domains += 1
        
        # Auto-increment minor version when domains are added
        if processed_domains > 0:
            capability.version_minor = (capability.version_minor or 0) + 1
            capability.version_patch = 0
            capability.version_build = 0
        
        # Update capability tracker
        tracker = db.query(CapabilityTracker).filter(CapabilityTracker.capability_name == capability_name).first()
        if tracker:
            tracker.review_completed = True
            tracker.last_updated = datetime.now()
        else:
            tracker = CapabilityTracker(
                capability_name=capability_name,
                review_completed=True,
                comprehensive_ready=False,
                last_updated=datetime.now()
            )
            db.add(tracker)
        
        # Update capability status
        capability.status = "ready"
        
        # Log activity if user_id provided
        if user_id:
            activity = ActivityLog(
                user_id=user_id,
                username="system",  # Will be updated by the API layer
                action="processed_domain_results",
                entity_type="capability",
                entity_id=capability.id,
                entity_name=capability_name,
                details=f"Processed {processed_domains} domains, skipped {skipped_domains} duplicates"
            )
            db.add(activity)
        
        db.commit()
        
        return {
            "processed_domains": processed_domains,
            "skipped_domains": skipped_domains,
            "capability_name": capability_name,
            "next_workflow_step": "comprehensive_research"
        }
    
    @staticmethod
    def process_comprehensive_results(db: Session, capability_name: str, data: Dict[str, Any], user_id: int = None) -> Dict[str, Any]:
        """Process comprehensive research results"""
        capability = db.query(Capability).filter(Capability.name == capability_name).first()
        if not capability:
            return {"error": "Capability not found"}
        
        processed_vendors = 0
        created_attributes = 0
        skipped_attributes = 0
        
        # Create domain mapping from domains file
        domain_mapping = {
            # Service Desk & Support
            "ticket logging": "Service Desk & Support",
            "multichannel": "Service Desk & Support",
            "sla tracking": "Service Desk & Support",
            "notification": "Service Desk & Support",
            
            # Incident Management
            "incident detection": "Incident Management",
            "incident classification": "Incident Management",
            "routing": "Incident Management",
            "assignment": "Incident Management",
            
            # Problem & Knowledge Management
            "root cause": "Problem & Knowledge Management",
            "knowledge": "Problem & Knowledge Management",
            "known error": "Problem & Knowledge Management",
            "problem": "Problem & Knowledge Management",
            
            # Change & Release Management
            "change planning": "Change & Release Management",
            "change impact": "Change & Release Management",
            "approval workflow": "Change & Release Management",
            "release coordination": "Change & Release Management",
            "release scheduling": "Change & Release Management",
            
            # Request & Catalog Management
            "service catalog": "Request & Catalog Management",
            "catalog management": "Request & Catalog Management",
            "request fulfillment": "Request & Catalog Management",
            "catalog structuring": "Request & Catalog Management",
            "lifecycle state": "Request & Catalog Management",
            "configuration flexibility": "Request & Catalog Management",
            "integration with product": "Request & Catalog Management",
            
            # Configuration & Asset Management
            "cmdb": "Configuration & Asset Management",
            "configuration management": "Configuration & Asset Management",
            "asset lifecycle": "Configuration & Asset Management",
            "asset inventory": "Configuration & Asset Management",
            "relationship mapping": "Configuration & Asset Management",
            
            # Service Level & Performance Analytics
            "sla definition": "Service Level & Performance Analytics",
            "performance analytics": "Service Level & Performance Analytics",
            "analytics": "Service Level & Performance Analytics",
            "reporting": "Service Level & Performance Analytics",
            "dashboard": "Service Level & Performance Analytics",
            
            # Automation, AI & Self-Service
            "virtual agent": "Automation, AI & Self-Service",
            "chatbot": "Automation, AI & Self-Service",
            "predictive intelligence": "Automation, AI & Self-Service",
            "machine learning": "Automation, AI & Self-Service",
            "self-service": "Automation, AI & Self-Service",
            "automation": "Automation, AI & Self-Service",
            
            # Field Service & Workforce Management
            "work order": "Field Service & Workforce Management",
            "dispatch": "Field Service & Workforce Management",
            "field service": "Field Service & Workforce Management",
            "workforce": "Field Service & Workforce Management",
            "mobile field": "Field Service & Workforce Management",
            
            # Integration & Compliance
            "api integration": "Integration & Compliance",
            "integration": "Integration & Compliance",
            "compliance": "Integration & Compliance",
            "security": "Integration & Compliance",
            "governance": "Integration & Compliance",
            "connector": "Integration & Compliance",
            
            # Domain Governance (NEW)
            "domain governance": "Domain Governance",
            "domain lifecycle": "Domain Governance",
            "domain modeling": "Domain Governance",
            "domain management": "Domain Governance",
            "domain control": "Domain Governance",
            "domain hierarchy": "Domain Governance",
            "domain framework": "Domain Governance",
            "domain standards": "Domain Governance",
            "domain compliance": "Domain Governance",
            "domain policy": "Domain Governance"
        }
        
        def map_attribute_to_domain(attribute_name: str) -> str:
            """Map attribute name to domain based on keywords"""
            attribute_lower = attribute_name.lower()
            
            # Check for exact matches first
            for keyword, domain in domain_mapping.items():
                if keyword in attribute_lower:
                    return domain
            
            # If no match found, try partial matches
            for keyword, domain in domain_mapping.items():
                if any(word in attribute_lower for word in keyword.split()):
                    return domain
            
            # Default to Service Desk & Support if no match
            return "Service Desk & Support"
        
        if "attributes" in data:
            for attr_data in data["attributes"]:
                attribute_name = attr_data.get("attribute")
                weight = attr_data.get("weight", 50)
                
                # Find the attribute by name for this capability
                attribute = db.query(Attribute).filter(
                    Attribute.capability_id == capability.id,
                    Attribute.attribute_name == attribute_name
                ).first()
                
                # Create attribute if it doesn't exist
                if not attribute:
                    # Use domain from JSON data if available, otherwise map using function
                    domain_name = attr_data.get("domain")
                    if not domain_name:
                        domain_name = map_attribute_to_domain(attribute_name)
                    
                    # Ensure domain exists in database
                    domain = db.query(Domain).filter(
                        Domain.capability_id == capability.id,
                        Domain.domain_name == domain_name
                    ).first()
                    
                    if not domain:
                        # Create domain if it doesn't exist
                        from services.domain_service import DomainService
                        from schemas.schemas import DomainCreate
                        domain_create = DomainCreate(
                            domain_name=domain_name,
                            description=f'Domain for {domain_name}',
                            importance='medium'
                        )
                        domain = DomainService.create_domain(db, capability.id, domain_create)
                        db.flush()  # Get the domain ID
                    
                    # Generate content hash for the attribute
                    attr_hash_data = {
                        'domain_name': domain_name,
                        'attribute_name': attribute_name,
                        'definition': attr_data.get("definition", ""),
                        'tm_forum_mapping': attr_data.get("tm_capability", ""),
                        'importance': str(weight)
                    }
                    content_hash = VersionManager.generate_attribute_hash(attr_hash_data)
                    
                    attribute = Attribute(
                        capability_id=capability.id,
                        domain_name=domain_name,
                        attribute_name=attribute_name,
                        definition=attr_data.get("definition", ""),
                        tm_forum_mapping=attr_data.get("tm_capability", ""),
                        importance=str(weight),
                        content_hash=content_hash,
                        version="1.0",
                        import_batch=None,
                        import_date=datetime.now(),
                        is_active=True
                    )
                    db.add(attribute)
                    db.flush()  # Get the attribute ID
                    created_attributes += 1
                
                # Process vendor scores
                for vendor in ["comarch", "servicenow", "salesforce"]:
                    if vendor in attr_data:
                        vendor_data = attr_data[vendor]
                        
                        # Handle evidence field - convert array to string if needed
                        evidence = vendor_data.get("evidence", "")
                        if isinstance(evidence, list):
                            evidence = ", ".join(evidence)
                        elif not isinstance(evidence, str):
                            evidence = str(evidence) if evidence else ""
                        
                        # Create vendor score
                        score = VendorScore(
                            capability_id=capability.id,
                            attribute_id=attribute.id,
                            vendor=vendor,
                            weight=weight,
                            score=vendor_data.get("score", ""),
                            score_numeric=int(vendor_data.get("score", "0").split()[0]) if vendor_data.get("score") else 0,
                            evidence_url=evidence,  # Now properly handled as string
                            score_decision=vendor_data.get("score_decision", ""),
                            research_type="capability_research",
                            research_date=datetime.fromisoformat(data.get("research_date", datetime.now().isoformat())),
                            created_at=datetime.now()
                        )
                        db.add(score)
                        db.flush()  # Get the score ID
                        
                        # Process observations
                        observations = vendor_data.get("observations", [])
                        if isinstance(observations, list):
                            for obs_data in observations:
                                if isinstance(obs_data, dict):
                                    observation = VendorScoreObservation(
                                        vendor_score_id=score.id,
                                        observation=obs_data.get("observation", ""),
                                        observation_type=obs_data.get("type", "NOTE")
                                    )
                                    db.add(observation)
                        else:
                            # Handle legacy format where observation is a string
                            if vendor_data.get("observation"):
                                observation = VendorScoreObservation(
                                    vendor_score_id=score.id,
                                    observation=vendor_data.get("observation", ""),
                                    observation_type="NOTE"
                                )
                                db.add(observation)
                        
                        processed_vendors += 1
        
        # Update capability tracker
        tracker = db.query(CapabilityTracker).filter(CapabilityTracker.capability_name == capability_name).first()
        if tracker:
            tracker.comprehensive_ready = True
            tracker.last_updated = datetime.now()
        else:
            tracker = CapabilityTracker(
                capability_name=capability_name,
                review_completed=True,
                comprehensive_ready=True,
                last_updated=datetime.now()
            )
            db.add(tracker)
        
        # Auto-increment patch version when comprehensive research is completed
        if processed_vendors > 0:
            capability.version_patch = (capability.version_patch or 0) + 1
            capability.version_build = 0
            capability.status = "completed"  # Mark as completed
            
            # Log capability completion
            if user_id:
                activity = ActivityLog(
                    user_id=user_id,
                    username="system",  # Will be updated by the API layer
                    action="capability_completed",
                    entity_type="capability",
                    entity_id=capability.id,
                    entity_name=capability.name,
                    details=f"Capability marked as completed with {processed_vendors} vendor scores and {created_attributes} attributes"
                )
                db.add(activity)
        
        db.commit()
        
        return {
            "processed_vendors": processed_vendors,
            "created_attributes": created_attributes,
            "skipped_attributes": skipped_attributes,
            "capability_name": capability_name,
            "capability_id": capability.id
        }
    
    @staticmethod
    def generate_radar_chart_data(db: Session, capability_id: int) -> RadarChartData:
        """Generate radar chart data for a capability"""
        capability = db.query(Capability).filter(Capability.id == capability_id).first()
        if not capability:
            raise ValueError("Capability not found")
        
        # Only proceed if capability is completed
        if capability.status != "completed":
            raise ValueError("Capability research is not completed")
        
        # Get all domains for this capability
        domains = db.query(Domain).filter(Domain.capability_id == capability_id).all()
        domain_names = [domain.domain_name for domain in domains]
        
        # Get vendor scores grouped by domain
        vendors = CapabilityService.get_active_vendors(db)
        scores = []
        
        for vendor in vendors:
            vendor_scores = []
            for domain in domains:
                # Get all vendor scores for attributes in this domain
                domain_scores = db.query(VendorScore).join(Attribute).filter(
                    VendorScore.capability_id == capability_id,
                    VendorScore.vendor == vendor,
                    Attribute.domain_name == domain.domain_name
                ).all()
                
                if domain_scores:
                    # Calculate average score for this domain
                    avg_score = sum(float(score.score_numeric) for score in domain_scores) / len(domain_scores)
                    vendor_scores.append(avg_score)
                else:
                    vendor_scores.append(0.0)
            
            scores.append(vendor_scores)
        
        return RadarChartData(
            capability_name=capability.name,
            vendors=vendors,
            attributes=domain_names,  # Now represents domains
            scores=scores
        )
    
    @staticmethod
    def generate_vendor_comparison_data(db: Session, capability_id: int) -> VendorComparisonData:
        """Generate vendor comparison data for a capability"""
        capability = db.query(Capability).filter(Capability.id == capability_id).first()
        if not capability:
            raise ValueError("Capability not found")
        
        # Only proceed if capability is completed
        if capability.status != "completed":
            raise ValueError("Capability research is not completed")
        
        # Get all attributes with weights
        attributes = db.query(Attribute).filter(Attribute.capability_id == capability_id).all()
        attribute_names = [attr.attribute_name for attr in attributes]
        weights = []
        for attr in attributes:
            try:
                if attr.importance and attr.importance.isdigit():
                    weights.append(int(attr.importance))
                else:
                    weights.append(50)  # Default weight
            except (ValueError, AttributeError):
                weights.append(50)  # Default weight
        
        # Get vendor scores
        vendors = CapabilityService.get_active_vendors(db)
        scores = {}
        
        for vendor in vendors:
            vendor_scores = []
            for attr in attributes:
                score = db.query(VendorScore).filter(
                    VendorScore.capability_id == capability_id,
                    VendorScore.attribute_id == attr.id,
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
        
        # Only proceed if capability is completed
        if capability.status != "completed":
            raise ValueError("Capability research is not completed")
        
        # Get all vendor scores
        scores_data = db.query(VendorScore).filter(VendorScore.capability_id == capability_id).all()
        
        # Define score ranges
        score_ranges = ["1-2", "2-3", "3-4", "4-5"]
        vendors = CapabilityService.get_active_vendors(db)
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

    @staticmethod
    def generate_vendor_analysis_data(db: Session, capability_id: int, vendors: list) -> dict:
        """Generate detailed vendor analysis data for comparison"""
        capability = db.query(Capability).filter(Capability.id == capability_id).first()
        if not capability:
            raise ValueError("Capability not found")
        
        # Only proceed if capability is completed
        if capability.status != "completed":
            raise ValueError("Capability research is not completed")
        
        # Get all attributes with their domains
        attributes = db.query(Attribute).filter(Attribute.capability_id == capability_id).all()
        
        analysis_items = []
        
        for attr in attributes:
            item = {
                'capability_name': capability.name,
                'domain_name': attr.domain_name,
                'attribute_name': attr.attribute_name,
                'vendors': {}
            }
            
            # Get vendor scores for this attribute
            for vendor in vendors:
                vendor_score = db.query(VendorScore).filter(
                    VendorScore.capability_id == capability_id,
                    VendorScore.attribute_id == attr.id,
                    VendorScore.vendor == vendor
                ).order_by(VendorScore.created_at.desc()).first()
                
                if vendor_score:
                    # Get observations for this vendor score
                    observations = db.query(VendorScoreObservation).filter(
                        VendorScoreObservation.vendor_score_id == vendor_score.id
                    ).all()
                    
                    observation_list = [
                        {
                            'observation': obs.observation,
                            'type': obs.observation_type.value
                        }
                        for obs in observations
                    ]
                    
                    item['vendors'][vendor] = {
                        'score': vendor_score.score,
                        'score_numeric': vendor_score.score_numeric,
                        'observations': observation_list,
                        'evidence_url': vendor_score.evidence_url,
                        'score_decision': vendor_score.score_decision,
                        'weight': vendor_score.weight
                    }
                else:
                    item['vendors'][vendor] = {
                        'score': 'N/A',
                        'score_numeric': 0,
                        'observations': [],
                        'evidence_url': 'N/A',
                        'score_decision': 'No data available',
                        'weight': 50
                    }
            
            analysis_items.append(item)
        
        return {
            'capability_name': capability.name,
            'vendors': vendors,
            'analysis_items': analysis_items,
            'total_attributes': len(attributes),
            'generated_at': datetime.now().isoformat()
        }

    @staticmethod
    def generate_filtered_reports_data(db: Session, capability_id: int, domains: list, vendors: list, attributes: list) -> dict:
        """Generate filtered reports data based on domain, vendor, and attribute filters"""
        capability = db.query(Capability).filter(Capability.id == capability_id).first()
        if not capability:
            raise ValueError("Capability not found")
        
        # Only proceed if capability is completed
        if capability.status != "completed":
            raise ValueError("Capability research is not completed")
        
        # Build query filters
        query_filters = [Attribute.capability_id == capability_id]
        
        if domains:
            query_filters.append(Attribute.domain_name.in_(domains))
        
        if attributes:
            query_filters.append(Attribute.attribute_name.in_(attributes))
        
        # Get filtered attributes
        attributes_data = db.query(Attribute).filter(*query_filters).all()
        
        if not attributes_data:
            return {
                'capability_name': capability.name,
                'vendors': vendors,
                'attributes': [],
                'domains': [],
                'radar_data': {'labels': [], 'datasets': []},
                'vendor_comparison': {'labels': [], 'datasets': []},
                'score_distribution': {'labels': [], 'datasets': []},
                'filtered_attributes': []
            }
        
        # Get unique domains from filtered attributes
        filtered_domains = list(set([attr.domain_name for attr in attributes_data]))
        
        # Generate radar chart data (by domains)
        radar_labels = filtered_domains
        radar_datasets = []
        
        for vendor in vendors:
            vendor_data = []
            for domain in filtered_domains:
                # Get average score for this domain and vendor
                domain_attributes = [attr for attr in attributes_data if attr.domain_name == domain]
                domain_scores = []
                
                for attr in domain_attributes:
                    score = db.query(VendorScore).filter(
                        VendorScore.capability_id == capability_id,
                        VendorScore.attribute_id == attr.id,
                        VendorScore.vendor == vendor
                    ).first()
                    if score:
                        domain_scores.append(score.score_numeric)
                
                avg_score = sum(domain_scores) / len(domain_scores) if domain_scores else 0
                vendor_data.append(avg_score)
            
            radar_datasets.append({
                'label': vendor.title(),
                'data': vendor_data,
                'backgroundColor': f'rgba({54 + len(radar_datasets) * 50}, {162 + len(radar_datasets) * 30}, {235 - len(radar_datasets) * 20}, 0.2)',
                'borderColor': f'rgba({54 + len(radar_datasets) * 50}, {162 + len(radar_datasets) * 30}, {235 - len(radar_datasets) * 20}, 1)',
                'borderWidth': 2
            })
        
        # Generate vendor comparison data (by attributes)
        comparison_labels = [attr.attribute_name for attr in attributes_data]
        comparison_datasets = []
        
        for vendor in vendors:
            vendor_data = []
            for attr in attributes_data:
                score = db.query(VendorScore).filter(
                    VendorScore.capability_id == capability_id,
                    VendorScore.attribute_id == attr.id,
                    VendorScore.vendor == vendor
                ).first()
                vendor_data.append(score.score_numeric if score else 0)
            
            comparison_datasets.append({
                'label': vendor.title(),
                'data': vendor_data,
                'backgroundColor': f'rgba({54 + len(comparison_datasets) * 50}, {162 + len(comparison_datasets) * 30}, {235 - len(comparison_datasets) * 20}, 0.8)',
                'borderColor': f'rgba({54 + len(comparison_datasets) * 50}, {162 + len(comparison_datasets) * 30}, {235 - len(comparison_datasets) * 20}, 1)',
                'borderWidth': 1
            })
        
        # Generate score distribution data
        score_ranges = ["1-2", "2-3", "3-4", "4-5"]
        distribution_labels = score_ranges
        distribution_datasets = []
        
        for vendor in vendors:
            vendor_counts = [0, 0, 0, 0]
            
            for attr in attributes_data:
                score = db.query(VendorScore).filter(
                    VendorScore.capability_id == capability_id,
                    VendorScore.attribute_id == attr.id,
                    VendorScore.vendor == vendor
                ).first()
                
                if score:
                    score_val = score.score_numeric
                    if 1 <= score_val <= 2:
                        vendor_counts[0] += 1
                    elif 2 < score_val <= 3:
                        vendor_counts[1] += 1
                    elif 3 < score_val <= 4:
                        vendor_counts[2] += 1
                    elif 4 < score_val <= 5:
                        vendor_counts[3] += 1
            
            distribution_datasets.append({
                'label': vendor.title(),
                'data': vendor_counts,
                'backgroundColor': [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 205, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)'
                ],
                'borderColor': [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 205, 86, 1)',
                    'rgba(75, 192, 192, 1)'
                ],
                'borderWidth': 1
            })
        
        # Prepare filtered attributes data
        filtered_attributes = []
        for attr in attributes_data:
            attr_data = {
                'attribute_name': attr.attribute_name,
                'domain_name': attr.domain_name,
                'definition': attr.definition,
                'importance': attr.importance,
                'vendors': {}
            }
            
            for vendor in vendors:
                score = db.query(VendorScore).filter(
                    VendorScore.capability_id == capability_id,
                    VendorScore.attribute_id == attr.id,
                    VendorScore.vendor == vendor
                ).first()
                
                if score:
                    # Get observations for this vendor score
                    observations = db.query(VendorScoreObservation).filter(
                        VendorScoreObservation.vendor_score_id == score.id
                    ).all()
                    
                    # Convert observations to list of dicts
                    observation_list = []
                    for obs in observations:
                        observation_list.append({
                            'observation': obs.observation,
                            'type': obs.observation_type.value
                        })
                    
                    # Parse evidence_url back to array if it's a comma-separated string
                    evidence_urls = []
                    if score.evidence_url:
                        if ',' in score.evidence_url:
                            evidence_urls = [url.strip() for url in score.evidence_url.split(',')]
                        else:
                            evidence_urls = [score.evidence_url.strip()]
                    
                    attr_data['vendors'][vendor] = {
                        'score': score.score,
                        'score_numeric': score.score_numeric,
                        'observations': observation_list,
                        'evidence_url': evidence_urls,
                        'score_decision': score.score_decision,
                        'weight': score.weight
                    }
                else:
                    attr_data['vendors'][vendor] = {
                        'score': 'N/A',
                        'score_numeric': 0,
                        'observations': [],
                        'evidence_url': 'N/A',
                        'score_decision': 'No data available',
                        'weight': 50
                    }
            
            filtered_attributes.append(attr_data)
        
        return {
            'capability_name': capability.name,
            'vendors': vendors,
            'attributes': [attr.attribute_name for attr in attributes_data],
            'domains': filtered_domains,
            'radar_data': {
                'labels': radar_labels,
                'datasets': radar_datasets
            },
            'vendor_comparison': {
                'labels': comparison_labels,
                'datasets': comparison_datasets
            },
            'score_distribution': {
                'labels': distribution_labels,
                'datasets': distribution_datasets
            },
            'filtered_attributes': filtered_attributes,
            'total_attributes': len(attributes_data),
            'generated_at': datetime.now().isoformat()
        }

    @staticmethod
    def get_available_filter_options(db: Session, capability_id: int) -> dict:
        """Get available filter options for a capability"""
        capability = db.query(Capability).filter(Capability.id == capability_id).first()
        if not capability:
            raise ValueError("Capability not found")
        
        # Only proceed if capability is completed
        if capability.status != "completed":
            raise ValueError("Capability research is not completed")
        
        # Get all domains
        domains = db.query(Attribute.domain_name).filter(
            Attribute.capability_id == capability_id
        ).distinct().all()
        domain_list = [domain[0] for domain in domains]
        
        # Get all attributes
        attributes = db.query(Attribute.attribute_name).filter(
            Attribute.capability_id == capability_id
        ).distinct().all()
        attribute_list = [attr[0] for attr in attributes]
        
        # Get all vendors
        vendors = db.query(VendorScore.vendor).filter(
            VendorScore.capability_id == capability_id
        ).distinct().all()
        vendor_list = [vendor[0] for vendor in vendors]
        
        return {
            'domains': domain_list,
            'attributes': attribute_list,
            'vendors': vendor_list,
            'capability_name': capability.name
        } 