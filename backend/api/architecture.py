from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime
import base64
import io

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
            vendor_performance = analyze_vendor_performance(vendor_scores, db)
            
            # Map capability to architecture layer
            layer_id = map_capability_to_layer(capability.name)["id"]
            layer = next((l for l in architecture_layers if l["id"] == layer_id), None)
            
            if layer:
                architecture_capability = {
                    "id": str(capability.id),
                    "name": capability.name,
                    "description": capability.description or "No description available",
                    "tmForumMapping": get_tmf_mapping(capability.name),
                    "recommendedVendor": vendor_performance["bestVendor"],
                    "vendorScore": vendor_performance["bestScore"],
                    "vendorScores": vendor_performance["scores"],
                    "status": vendor_performance["status"],
                    "evidence": [f"Score: {vendor_performance['bestScore']}/5 for {vendor_performance['bestVendor']}"]
                }
                
                layer["capabilities"].append(architecture_capability)
                total_capabilities += 1
                
                # Update summary statistics
                if vendor_performance["status"] == "excellent":
                    excellent_vendors += 1
                elif vendor_performance["status"] == "good":
                    good_vendors += 1
                elif vendor_performance["status"] == "fair":
                    fair_vendors += 1
                elif vendor_performance["status"] == "poor":
                    poor_vendors += 1
                else:
                    no_data += 1

        # Generate recommendations
        recommendations = generate_recommendations(architecture_layers)
        
        # Create summary
        summary = {
            "totalCapabilities": total_capabilities,
            "excellentVendors": excellent_vendors,
            "goodVendors": good_vendors,
            "fairVendors": fair_vendors,
            "poorVendors": poor_vendors,
            "noData": no_data
        }
        
        # Filter out empty layers
        architecture_layers = [layer for layer in architecture_layers if layer["capabilities"]]
        
        canvas_data = {
            "layers": architecture_layers,
            "summary": summary,
            "recommendations": recommendations,
            "generatedAt": datetime.now().isoformat()
        }
        
        return APIResponse(success=True, data=canvas_data)
        
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/canvas/export/pdf", response_model=APIResponse)
async def export_architecture_canvas_pdf(db: Session = Depends(get_db)):
    """Export Architecture Canvas as PDF"""
    try:
        # Get canvas data
        canvas_response = await get_architecture_canvas(db)
        if not canvas_response.success:
            return canvas_response
        
        canvas_data = canvas_response.data
        
        # Generate PDF
        pdf_data = generate_architecture_canvas_pdf(canvas_data)
        
        return APIResponse(
            success=True,
            data={
                "pdf_data": pdf_data,
                "filename": f"TM_Forum_Architecture_Canvas_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            }
        )
        
    except Exception as e:
        return APIResponse(success=False, error=str(e))

def generate_architecture_canvas_pdf(canvas_data: Dict[str, Any]) -> str:
    """Generate PDF report for Architecture Canvas"""
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4, letter
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        
        # Create PDF buffer
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
        
        # Get styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            alignment=1  # Center alignment
        )
        
        # Build story
        story = []
        
        # Title
        story.append(Paragraph("TM Forum Telco Architecture Canvas", title_style))
        story.append(Spacer(1, 12))
        
        # Summary
        summary = canvas_data["summary"]
        story.append(Paragraph("Executive Summary", styles['Heading2']))
        story.append(Spacer(1, 12))
        
        summary_data = [
            ["Metric", "Count"],
            ["Total Capabilities", str(summary["totalCapabilities"])],
            ["Excellent Vendors", str(summary["excellentVendors"])],
            ["Good Vendors", str(summary["goodVendors"])],
            ["Fair Vendors", str(summary["fairVendors"])],
            ["Poor Vendors", str(summary["poorVendors"])],
            ["No Data", str(summary["noData"])]
        ]
        
        summary_table = Table(summary_data)
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 20))
        
        # Architecture Layers
        story.append(Paragraph("Architecture Layers & Capabilities", styles['Heading2']))
        story.append(Spacer(1, 12))
        
        for layer in canvas_data["layers"]:
            story.append(Paragraph(f"Layer: {layer['name']}", styles['Heading3']))
            story.append(Paragraph(f"Description: {layer['description']}", styles['Normal']))
            story.append(Spacer(1, 12))
            
            if layer["capabilities"]:
                # Create capabilities table
                cap_data = [["Capability", "Recommended Vendor", "Score", "Status", "TM Forum Mapping"]]
                
                for cap in layer["capabilities"]:
                    cap_data.append([
                        cap["name"],
                        cap["recommendedVendor"],
                        str(cap["vendorScore"]),
                        cap["status"].title(),
                        cap["tmForumMapping"]
                    ])
                
                cap_table = Table(cap_data)
                cap_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 12),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black),
                    ('FONTSIZE', (0, 1), (-1, -1), 10),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.beige, colors.white])
                ]))
                story.append(cap_table)
            else:
                story.append(Paragraph("No capabilities mapped to this layer", styles['Italic']))
            
            story.append(Spacer(1, 20))
        
        # Recommendations
        recommendations = canvas_data["recommendations"]
        story.append(Paragraph("Strategic Recommendations", styles['Heading2']))
        story.append(Spacer(1, 12))
        
        story.append(Paragraph("Top Recommended Vendors:", styles['Heading4']))
        for vendor in recommendations["topVendors"]:
            story.append(Paragraph(f"• {vendor}", styles['Normal']))
        
        story.append(Spacer(1, 12))
        story.append(Paragraph("Critical Gaps:", styles['Heading4']))
        for gap in recommendations["criticalGaps"]:
            story.append(Paragraph(f"• {gap}", styles['Normal']))
        
        story.append(Spacer(1, 12))
        story.append(Paragraph("Next Steps:", styles['Heading4']))
        for step in recommendations["nextSteps"]:
            story.append(Paragraph(f"• {step}", styles['Normal']))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        
        # Convert to base64
        pdf_base64 = base64.b64encode(buffer.getvalue()).decode()
        return pdf_base64
        
    except Exception as e:
        raise Exception(f"Error generating PDF: {str(e)}")

def analyze_vendor_performance(vendor_scores: List[VendorScore], db: Session) -> Dict[str, Any]:
    """Analyze vendor performance for a capability"""
    from services.capability_service import CapabilityService
    
    vendors = CapabilityService.get_active_vendors(db)
    scores = {vendor: 0 for vendor in vendors}
    evidence = []
    score_counts = {vendor: 0 for vendor in vendors}

    # Calculate total scores for each vendor
    for score in vendor_scores:
        vendor_lower = score.vendor.lower()
        if vendor_lower in vendors:
            scores[vendor_lower] += score.score_numeric
            score_counts[vendor_lower] += 1

    # Calculate average scores
    avg_scores = {}
    for vendor in vendors:
        count = score_counts[vendor]
        avg_scores[vendor] = scores[vendor] / count if count > 0 else 0

    # Find best vendor
    best_vendor = max(avg_scores, key=avg_scores.get) if avg_scores else None
    best_score = avg_scores[best_vendor] if best_vendor else 0

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
        "bestVendor": best_vendor.capitalize() if best_vendor else "None",
        "bestScore": round(best_score, 1),
        "scores": avg_scores,
        "status": status,
        "evidence": []  # No longer collecting evidence URLs
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
        vendor_performance = analyze_vendor_performance(vendor_scores, db)
        
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