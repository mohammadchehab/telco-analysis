from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime

from core.database import get_db
from core.auth import get_current_user
from services.capability_service import CapabilityService
from schemas.schemas import APIResponse
from models.models import Capability, VendorScore, Attribute

router = APIRouter(prefix="/architecture", tags=["architecture"])

@router.get("/canvas", response_model=APIResponse)
async def get_architecture_canvas(db: Session = Depends(get_db)):
    """Get TM Forum Telco Architecture Canvas with vendor recommendations"""
    try:
        # Get all completed capabilities
        capabilities = db.query(Capability).filter(Capability.status == "completed").all()
        
        # TM Forum Telco Architecture Layers
        architecture_layers = [
            {
                "id": "business",
                "name": "Business Support Systems (BSS)",
                "description": "Customer-facing systems for order management, billing, and customer care",
                "color": "#4CAF50",
                "capabilities": []
            },
            {
                "id": "operations",
                "name": "Operations Support Systems (OSS)",
                "description": "Network and service management systems",
                "color": "#2196F3",
                "capabilities": []
            },
            {
                "id": "data",
                "name": "Data & Analytics",
                "description": "Data management, analytics, and business intelligence",
                "color": "#FF9800",
                "capabilities": []
            },
            {
                "id": "security",
                "name": "Security & Identity",
                "description": "Security management, identity, and access control",
                "color": "#F44336",
                "capabilities": []
            },
            {
                "id": "network",
                "name": "Network & Infrastructure",
                "description": "Network management, infrastructure, and connectivity",
                "color": "#9C27B0",
                "capabilities": []
            },
            {
                "id": "storage",
                "name": "Storage & Compute",
                "description": "Data storage, computing resources, and cloud infrastructure",
                "color": "#607D8B",
                "capabilities": []
            }
        ]

        total_capabilities = 0
        excellent_vendors = 0
        good_vendors = 0
        fair_vendors = 0
        poor_vendors = 0
        no_data = 0

        # Process each capability
        for capability in capabilities:
            # Get attributes for this capability
            attributes = db.query(Attribute).filter(Attribute.capability_id == capability.id).all()
            
            if not attributes:
                continue

            # Get vendor scores for this capability
            vendor_scores = db.query(VendorScore).filter(
                VendorScore.capability_id == capability.id
            ).all()

            if not vendor_scores:
                continue

            # Analyze vendor performance
            vendor_performance = analyze_vendor_performance(vendor_scores)
            
            # Map capability to architecture layer
            layer_id = map_capability_to_layer(capability.name)["id"]
            layer = next((l for l in architecture_layers if l["id"] == layer_id), None)
            
            if layer:
                architecture_capability = {
                    "id": str(capability.id),
                    "name": capability.name,
                    "description": capability.description or "",
                    "tmForumMapping": get_tmf_mapping(capability.name),
                    "recommendedVendor": vendor_performance["bestVendor"],
                    "vendorScore": vendor_performance["bestScore"],
                    "vendorScores": vendor_performance["scores"],
                    "status": vendor_performance["status"],
                    "evidence": vendor_performance["evidence"]
                }

                layer["capabilities"].append(architecture_capability)
                total_capabilities += 1

                # Update counters
                status = vendor_performance["status"]
                if status == "excellent":
                    excellent_vendors += 1
                elif status == "good":
                    good_vendors += 1
                elif status == "fair":
                    fair_vendors += 1
                elif status == "poor":
                    poor_vendors += 1
                else:
                    no_data += 1

        # Generate recommendations
        recommendations = generate_recommendations(architecture_layers)

        # Filter out empty layers
        populated_layers = [layer for layer in architecture_layers if layer["capabilities"]]

        return APIResponse(
            success=True,
            data={
                "layers": populated_layers,
                "summary": {
                    "totalCapabilities": total_capabilities,
                    "excellentVendors": excellent_vendors,
                    "goodVendors": good_vendors,
                    "fairVendors": fair_vendors,
                    "poorVendors": poor_vendors,
                    "noData": no_data
                },
                "recommendations": recommendations
            }
        )

    except Exception as e:
        return APIResponse(success=False, error=str(e))

def analyze_vendor_performance(vendor_scores: List[VendorScore]) -> Dict[str, Any]:
    """Analyze vendor performance for a capability"""
    vendors = ["comarch", "servicenow", "salesforce"]
    scores = {"comarch": 0, "servicenow": 0, "salesforce": 0}
    evidence = []
    score_counts = {"comarch": 0, "servicenow": 0, "salesforce": 0}

    # Calculate total scores for each vendor
    for score in vendor_scores:
        vendor_lower = score.vendor.lower()
        if vendor_lower in vendors:
            scores[vendor_lower] += score.score_numeric
            score_counts[vendor_lower] += 1
            
            if score.evidence_url:
                try:
                    evidence_urls = eval(score.evidence_url) if isinstance(score.evidence_url, str) else score.evidence_url
                    if isinstance(evidence_urls, list):
                        evidence.extend(evidence_urls)
                except:
                    pass

    # Calculate average scores
    avg_scores = {}
    for vendor in vendors:
        count = score_counts[vendor]
        avg_scores[vendor] = scores[vendor] / count if count > 0 else 0

    # Find best vendor
    best_vendor = max(avg_scores, key=avg_scores.get)
    best_score = avg_scores[best_vendor]

    # Determine status
    status = "no-data"
    if any(score_counts.values()):
        if best_score >= 4.5:
            status = "excellent"
        elif best_score >= 3.5:
            status = "good"
        elif best_score >= 2.5:
            status = "fair"
        else:
            status = "poor"

    return {
        "bestVendor": best_vendor.capitalize(),
        "bestScore": round(best_score, 1),
        "scores": avg_scores,
        "status": status,
        "evidence": list(set(evidence))  # Remove duplicates
    }

def map_capability_to_layer(capability_name: str) -> Dict[str, Any]:
    """Map capability to TM Forum architecture layer"""
    name = capability_name.lower()
    
    # BSS Layer
    if any(keyword in name for keyword in ["billing", "order", "customer", "product", "pricing", "revenue", "subscription", "partner"]):
        return {
            "id": "business",
            "name": "Business Support Systems (BSS)",
            "description": "Customer-facing systems for order management, billing, and customer care",
            "color": "#4CAF50",
            "capabilities": []
        }
    
    # OSS Layer
    if any(keyword in name for keyword in ["network", "service", "fault", "performance", "configuration", "provisioning", "assurance", "it service"]):
        return {
            "id": "operations",
            "name": "Operations Support Systems (OSS)",
            "description": "Network and service management systems",
            "color": "#2196F3",
            "capabilities": []
        }
    
    # Data & Analytics Layer
    if any(keyword in name for keyword in ["data", "analytics", "intelligence", "reporting", "insights", "ml", "ai", "machine learning", "big data"]):
        return {
            "id": "data",
            "name": "Data & Analytics",
            "description": "Data management, analytics, and business intelligence",
            "color": "#FF9800",
            "capabilities": []
        }
    
    # Security Layer
    if any(keyword in name for keyword in ["security", "identity", "access", "authentication", "authorization", "compliance", "privacy"]):
        return {
            "id": "security",
            "name": "Security & Identity",
            "description": "Security management, identity, and access control",
            "color": "#F44336",
            "capabilities": []
        }
    
    # Network & Infrastructure Layer
    if any(keyword in name for keyword in ["infrastructure", "connectivity", "transport", "routing", "switching", "core network"]):
        return {
            "id": "network",
            "name": "Network & Infrastructure",
            "description": "Network management, infrastructure, and connectivity",
            "color": "#9C27B0",
            "capabilities": []
        }
    
    # Storage & Compute Layer
    if any(keyword in name for keyword in ["storage", "compute", "cloud", "virtualization", "container", "orchestration"]):
        return {
            "id": "storage",
            "name": "Storage & Compute",
            "description": "Data storage, computing resources, and cloud infrastructure",
            "color": "#607D8B",
            "capabilities": []
        }
    
    # Default to OSS if no clear mapping
    return {
        "id": "operations",
        "name": "Operations Support Systems (OSS)",
        "description": "Network and service management systems",
        "color": "#2196F3",
        "capabilities": []
    }

def get_tmf_mapping(capability_name: str) -> str:
    """Get TM Forum mapping for a capability"""
    mappings = {
        "billing": "TMF622",
        "order management": "TMF622",
        "customer management": "TMF629",
        "product catalog": "TMF620",
        "network management": "TMF513",
        "service management": "TMF513",
        "data analytics": "TMF630",
        "security management": "TMF513",
        "infrastructure management": "TMF513",
        "partner management": "TMF629",
        "revenue management": "TMF622",
        "service assurance": "TMF513",
        "service fulfillment": "TMF513",
        "resource management": "TMF513",
        "data management": "TMF630",
        "identity management": "TMF513",
        "access management": "TMF513"
    }

    name = capability_name.lower()
    for key, value in mappings.items():
        if key in name:
            return value
    
    return "TMF513"  # Default mapping

def generate_recommendations(layers: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate recommendations based on architecture analysis"""
    vendor_counts = {"Comarch": 0, "Servicenow": 0, "Salesforce": 0}
    critical_gaps = []
    next_steps = []

    # Count vendor recommendations
    for layer in layers:
        for capability in layer["capabilities"]:
            vendor_counts[capability["recommendedVendor"]] += 1
            
            if capability["status"] in ["poor", "no-data"]:
                critical_gaps.append(f"{capability['name']} ({layer['name']})")

    # Find top vendors
    top_vendors = sorted(vendor_counts.items(), key=lambda x: x[1], reverse=True)[:2]
    top_vendor_names = [vendor[0] for vendor in top_vendors]

    # Generate next steps
    if critical_gaps:
        next_steps.append("Address critical capability gaps identified in the architecture")
    
    empty_layers = [layer for layer in layers if not layer["capabilities"]]
    if empty_layers:
        next_steps.append("Complete research for missing capabilities in each layer")
    
    next_steps.extend([
        "Validate vendor recommendations with proof-of-concept testing",
        "Develop integration roadmap based on recommended vendors",
        "Establish governance framework for vendor selection",
        "Create implementation timeline for recommended solutions"
    ])

    return {
        "topVendors": top_vendor_names,
        "criticalGaps": critical_gaps[:10],  # Limit to top 10
        "nextSteps": next_steps
    }

@router.get("/capability/{capability_id}/details", response_model=APIResponse)
async def get_capability_details(capability_id: int, db: Session = Depends(get_db)):
    """Get detailed information for a specific capability in the architecture"""
    try:
        capability = db.query(Capability).filter(Capability.id == capability_id).first()
        if not capability:
            return APIResponse(success=False, error="Capability not found")

        # Get attributes
        attributes = db.query(Attribute).filter(Attribute.capability_id == capability_id).all()
        
        # Get vendor scores
        vendor_scores = db.query(VendorScore).filter(VendorScore.capability_id == capability_id).all()
        
        # Analyze vendor performance
        vendor_performance = analyze_vendor_performance(vendor_scores)
        
        # Get layer mapping
        layer = map_capability_to_layer(capability.name)

        return APIResponse(
            success=True,
            data={
                "capability": {
                    "id": capability.id,
                    "name": capability.name,
                    "description": capability.description,
                    "status": capability.status,
                    "tmForumMapping": get_tmf_mapping(capability.name),
                    "layer": layer,
                    "attributes_count": len(attributes),
                    "vendor_performance": vendor_performance
                }
            }
        )

    except Exception as e:
        return APIResponse(success=False, error=str(e)) 