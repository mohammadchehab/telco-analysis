from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import json
from datetime import datetime
import pandas as pd
import io
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from core.database import get_db
from services.capability_service import CapabilityService
from schemas.schemas import (
    APIResponse, ReportRequest, RadarChartData, VendorComparisonData, 
    ScoreDistributionData, ChartData
)

router = APIRouter(prefix="/api/reports", tags=["reports"])

@router.post("/generate", response_model=APIResponse)
async def generate_report(request: ReportRequest, db: Session = Depends(get_db)):
    """Generate comprehensive report for a capability"""
    try:
        capability = CapabilityService.get_capability(db, request.capability_id)
        if not capability:
            return APIResponse(success=False, error="Capability not found")
        
        # Generate different types of data based on report type
        if request.report_type == "vendor_comparison":
            data = CapabilityService.generate_vendor_comparison_data(db, request.capability_id)
        elif request.report_type == "radar_chart":
            data = CapabilityService.generate_radar_chart_data(db, request.capability_id)
        elif request.report_type == "score_distribution":
            data = CapabilityService.generate_score_distribution_data(db, request.capability_id)
        elif request.report_type == "comprehensive":
            # Generate all types of data for comprehensive report
            radar_data = CapabilityService.generate_radar_chart_data(db, request.capability_id)
            vendor_data = CapabilityService.generate_vendor_comparison_data(db, request.capability_id)
            distribution_data = CapabilityService.generate_score_distribution_data(db, request.capability_id)
            vendor_scores = CapabilityService.get_vendor_scores(db, capability.name)
            
            data = {
                "capability_name": capability.name,
                "generated_at": datetime.now().isoformat(),
                "radar_chart": radar_data.model_dump(),
                "vendor_comparison": vendor_data.model_dump(),
                "score_distribution": distribution_data.model_dump(),
                "vendor_scores": [score.model_dump() for score in vendor_scores]
            }
        else:
            return APIResponse(success=False, error="Invalid report type")
        
        # Format the response based on requested format
        if request.format == "json":
            return APIResponse(
                success=True,
                data=data.model_dump() if hasattr(data, 'model_dump') else data
            )
        elif request.format == "excel":
            excel_data = generate_excel_report(data, capability.name, request.report_type)
            return APIResponse(
                success=True,
                data={"excel_data": excel_data, "filename": f"{capability.name}_{request.report_type}_report.xlsx"}
            )
        elif request.format == "pdf":
            pdf_data = generate_pdf_report(data, capability.name, request.report_type)
            return APIResponse(
                success=True,
                data={"pdf_data": pdf_data, "filename": f"{capability.name}_{request.report_type}_report.pdf"}
            )
        else:
            return APIResponse(success=False, error="Invalid format")
            
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/{capability_id}/radar-chart", response_model=APIResponse)
async def get_radar_chart_data(capability_id: int, db: Session = Depends(get_db)):
    """Get radar chart data for a capability"""
    try:
        data = CapabilityService.generate_radar_chart_data(db, capability_id)
        return APIResponse(success=True, data=data.model_dump())
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/{capability_id}/vendor-comparison", response_model=APIResponse)
async def get_vendor_comparison_data(capability_id: int, db: Session = Depends(get_db)):
    """Get vendor comparison data for a capability"""
    try:
        data = CapabilityService.generate_vendor_comparison_data(db, capability_id)
        return APIResponse(success=True, data=data.model_dump())
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/{capability_id}/score-distribution", response_model=APIResponse)
async def get_score_distribution_data(capability_id: int, db: Session = Depends(get_db)):
    """Get score distribution data for a capability"""
    try:
        data = CapabilityService.generate_score_distribution_data(db, capability_id)
        return APIResponse(success=True, data=data.model_dump())
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/{capability_id}/comprehensive", response_model=APIResponse)
async def get_comprehensive_report(capability_id: int, db: Session = Depends(get_db)):
    """Get comprehensive report data for a capability"""
    try:
        capability = CapabilityService.get_capability(db, capability_id)
        if not capability:
            return APIResponse(success=False, error="Capability not found")
        
        # Generate all types of data
        radar_data = CapabilityService.generate_radar_chart_data(db, capability_id)
        vendor_data = CapabilityService.generate_vendor_comparison_data(db, capability_id)
        distribution_data = CapabilityService.generate_score_distribution_data(db, capability_id)
        vendor_scores = CapabilityService.get_vendor_scores(db, capability.name)
        
        comprehensive_data = {
            "capability_name": capability.name,
            "generated_at": datetime.now().isoformat(),
            "radar_chart": radar_data.model_dump(),
            "vendor_comparison": vendor_data.model_dump(),
            "score_distribution": distribution_data.model_dump(),
            "vendor_scores": [score.model_dump() for score in vendor_scores]
        }
        
        return APIResponse(success=True, data=comprehensive_data)
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/{capability_id}/summary", response_model=APIResponse)
async def get_capability_summary(capability_id: int, db: Session = Depends(get_db)):
    """Get summary statistics for a capability"""
    try:
        capability = CapabilityService.get_capability(db, capability_id)
        if not capability:
            return APIResponse(success=False, error="Capability not found")
        
        # Get vendor scores for summary calculations
        vendor_scores = CapabilityService.get_vendor_scores(db, capability.name)
        
        # Calculate summary statistics
        vendors = ["comarch", "servicenow", "salesforce"]
        summary_stats = {}
        
        for vendor in vendors:
            vendor_scores_list = [score for score in vendor_scores if score.vendor == vendor]
            if vendor_scores_list:
                avg_score = sum(score.score_numeric for score in vendor_scores_list) / len(vendor_scores_list)
                max_score = max(score.score_numeric for score in vendor_scores_list)
                min_score = min(score.score_numeric for score in vendor_scores_list)
                total_attributes = len(vendor_scores_list)
                
                summary_stats[vendor] = {
                    "average_score": round(avg_score, 2),
                    "max_score": max_score,
                    "min_score": min_score,
                    "total_attributes": total_attributes,
                    "score_range": f"{min_score}-{max_score}"
                }
        
        summary_data = {
            "capability_name": capability.name,
            "capability_status": capability.status,
            "total_attributes": len(vendor_scores) // len(vendors) if vendors else 0,
            "vendors_analyzed": len(vendors),
            "last_updated": datetime.now().isoformat(),
            "vendor_summaries": summary_stats
        }
        
        return APIResponse(success=True, data=summary_data)
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/{capability_id}/export/{format}", response_model=APIResponse)
async def export_capability_report(
    capability_id: int, 
    format: str, 
    report_type: str = "comprehensive",
    db: Session = Depends(get_db)
):
    """Export capability report in specified format"""
    try:
        capability = CapabilityService.get_capability(db, capability_id)
        if not capability:
            return APIResponse(success=False, error="Capability not found")
        
        # Generate report data
        if report_type == "comprehensive":
            radar_data = CapabilityService.generate_radar_chart_data(db, capability_id)
            vendor_data = CapabilityService.generate_vendor_comparison_data(db, capability_id)
            distribution_data = CapabilityService.generate_score_distribution_data(db, capability_id)
            vendor_scores = CapabilityService.get_vendor_scores(db, capability.name)
            
            data = {
                "capability_name": capability.name,
                "generated_at": datetime.now().isoformat(),
                "radar_chart": radar_data.model_dump(),
                "vendor_comparison": vendor_data.model_dump(),
                "score_distribution": distribution_data.model_dump(),
                "vendor_scores": [score.model_dump() for score in vendor_scores]
            }
        else:
            # Handle other report types
            if report_type == "vendor_comparison":
                data = CapabilityService.generate_vendor_comparison_data(db, capability_id)
            elif report_type == "radar_chart":
                data = CapabilityService.generate_radar_chart_data(db, capability_id)
            elif report_type == "score_distribution":
                data = CapabilityService.generate_score_distribution_data(db, capability_id)
            else:
                return APIResponse(success=False, error="Invalid report type")
        
        # Generate export file
        if format.lower() == "excel":
            export_data = generate_excel_report(data, capability.name, report_type)
            filename = f"{capability.name}_{report_type}_report.xlsx"
        elif format.lower() == "pdf":
            export_data = generate_pdf_report(data, capability.name, report_type)
            filename = f"{capability.name}_{report_type}_report.pdf"
        else:
            return APIResponse(success=False, error="Invalid export format")
        
        return APIResponse(
            success=True,
            data={
                "export_data": export_data,
                "filename": filename,
                "format": format,
                "report_type": report_type
            }
        )
        
    except Exception as e:
        return APIResponse(success=False, error=str(e))

def generate_excel_report(data: Any, capability_name: str, report_type: str) -> str:
    """Generate Excel report from data"""
    try:
        wb = Workbook()
        ws = wb.active
        ws.title = f"{capability_name} Report"
        
        # Header
        ws['A1'] = f"{capability_name} - {report_type.replace('_', ' ').title()} Report"
        ws['A1'].font = Font(size=16, bold=True)
        ws['A2'] = f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        
        # Add data based on report type
        if report_type == "vendor_comparison":
            add_vendor_comparison_to_excel(ws, data)
        elif report_type == "radar_chart":
            add_radar_chart_to_excel(ws, data)
        elif report_type == "score_distribution":
            add_score_distribution_to_excel(ws, data)
        elif report_type == "comprehensive":
            add_comprehensive_to_excel(ws, data)
        
        # Save to bytes
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        # Convert to base64 for API response
        import base64
        return base64.b64encode(output.getvalue()).decode('utf-8')
        
    except Exception as e:
        raise Exception(f"Error generating Excel report: {str(e)}")

def generate_pdf_report(data: Any, capability_name: str, report_type: str) -> str:
    """Generate PDF report from data"""
    try:
        # Create PDF document
        output = io.BytesIO()
        doc = SimpleDocTemplate(output, pagesize=A4)
        story = []
        
        # Add title
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30
        )
        story.append(Paragraph(f"{capability_name} - {report_type.replace('_', ' ').title()} Report", title_style))
        story.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Add data based on report type
        if report_type == "vendor_comparison":
            add_vendor_comparison_to_pdf(story, data)
        elif report_type == "radar_chart":
            add_radar_chart_to_pdf(story, data)
        elif report_type == "score_distribution":
            add_score_distribution_to_pdf(story, data)
        elif report_type == "comprehensive":
            add_comprehensive_to_pdf(story, data)
        
        # Build PDF
        doc.build(story)
        output.seek(0)
        
        # Convert to base64 for API response
        import base64
        return base64.b64encode(output.getvalue()).decode('utf-8')
        
    except Exception as e:
        raise Exception(f"Error generating PDF report: {str(e)}")

def add_vendor_comparison_to_excel(ws, data):
    """Add vendor comparison data to Excel worksheet"""
    # Add vendor comparison table
    ws['A4'] = "Vendor Comparison"
    ws['A4'].font = Font(size=14, bold=True)
    
    # Headers
    headers = ["Attribute"] + data.vendors
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=5, column=col, value=header)
        cell.font = Font(bold=True)
        cell.fill = PatternFill(start_color="CCCCCC", end_color="CCCCCC", fill_type="solid")
    
    # Data
    for row, attribute in enumerate(data.attributes, 6):
        ws.cell(row=row, column=1, value=attribute)
        for col, vendor in enumerate(data.vendors, 2):
            score = data.scores[vendor][row-6]
            ws.cell(row=row, column=col, value=score)

def add_radar_chart_to_excel(ws, data):
    """Add radar chart data to Excel worksheet"""
    # Add radar chart data table
    ws['A4'] = "Radar Chart Data"
    ws['A4'].font = Font(size=14, bold=True)
    
    # Headers
    headers = ["Attribute"] + data.vendors
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=5, column=col, value=header)
        cell.font = Font(bold=True)
        cell.fill = PatternFill(start_color="CCCCCC", end_color="CCCCCC", fill_type="solid")
    
    # Data
    for row, attribute in enumerate(data.attributes, 6):
        ws.cell(row=row, column=1, value=attribute)
        for col, vendor_scores in enumerate(data.scores, 2):
            score = vendor_scores[row-6]
            ws.cell(row=row, column=col, value=score)

def add_score_distribution_to_excel(ws, data):
    """Add score distribution data to Excel worksheet"""
    # Add score distribution table
    ws['A4'] = "Score Distribution"
    ws['A4'].font = Font(size=14, bold=True)
    
    # Headers
    headers = ["Score Range"] + data.vendors
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=5, column=col, value=header)
        cell.font = Font(bold=True)
        cell.fill = PatternFill(start_color="CCCCCC", end_color="CCCCCC", fill_type="solid")
    
    # Data
    for row, score_range in enumerate(data.score_ranges, 6):
        ws.cell(row=row, column=1, value=score_range)
        for col, vendor in enumerate(data.vendors, 2):
            count = data.vendor_counts[vendor][row-6]
            ws.cell(row=row, column=col, value=count)

def add_comprehensive_to_excel(ws, data):
    """Add comprehensive report data to Excel worksheet"""
    # Add multiple sheets for comprehensive report
    # This is a simplified version - you can expand this based on your needs
    
    # Summary sheet
    ws['A4'] = "Capability Summary"
    ws['A4'].font = Font(size=14, bold=True)
    ws['A5'] = f"Capability: {data['capability_name']}"
    ws['A6'] = f"Generated: {data['generated_at']}"
    
    # Add vendor scores summary
    if 'vendor_scores' in data:
        ws['A8'] = "Vendor Scores Summary"
        ws['A8'].font = Font(size=12, bold=True)
        
        headers = ["Vendor", "Attribute", "Score", "Weight", "Decision"]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=9, column=col, value=header)
            cell.font = Font(bold=True)
        
        row = 10
        for score in data['vendor_scores']:
            ws.cell(row=row, column=1, value=score['vendor'])
            ws.cell(row=row, column=2, value=score['attribute_name'])
            ws.cell(row=row, column=3, value=score['score'])
            ws.cell(row=row, column=4, value=score['weight'])
            ws.cell(row=row, column=5, value=score['score_decision'])
            row += 1

def add_vendor_comparison_to_pdf(story, data):
    """Add vendor comparison data to PDF story"""
    story.append(Paragraph("Vendor Comparison", getSampleStyleSheet()['Heading2']))
    
    # Create table data
    table_data = [["Attribute"] + data.vendors]
    for i, attribute in enumerate(data.attributes):
        row = [attribute]
        for vendor in data.vendors:
            score = data.scores[vendor][i]
            row.append(str(score))
        table_data.append(row)
    
    # Create table
    table = Table(table_data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    story.append(table)
    story.append(Spacer(1, 20))

def add_radar_chart_to_pdf(story, data):
    """Add radar chart data to PDF story"""
    story.append(Paragraph("Radar Chart Data", getSampleStyleSheet()['Heading2']))
    
    # Create table data
    table_data = [["Attribute"] + data.vendors]
    for i, attribute in enumerate(data.attributes):
        row = [attribute]
        for vendor_scores in data.scores:
            score = vendor_scores[i]
            row.append(str(score))
        table_data.append(row)
    
    # Create table
    table = Table(table_data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    story.append(table)
    story.append(Spacer(1, 20))

def add_score_distribution_to_pdf(story, data):
    """Add score distribution data to PDF story"""
    story.append(Paragraph("Score Distribution", getSampleStyleSheet()['Heading2']))
    
    # Create table data
    table_data = [["Score Range"] + data.vendors]
    for i, score_range in enumerate(data.score_ranges):
        row = [score_range]
        for vendor in data.vendors:
            count = data.vendor_counts[vendor][i]
            row.append(str(count))
        table_data.append(row)
    
    # Create table
    table = Table(table_data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    story.append(table)
    story.append(Spacer(1, 20))

def add_comprehensive_to_pdf(story, data):
    """Add comprehensive report data to PDF story"""
    story.append(Paragraph("Comprehensive Report", getSampleStyleSheet()['Heading2']))
    
    # Add vendor scores summary
    if 'vendor_scores' in data:
        story.append(Paragraph("Vendor Scores Summary", getSampleStyleSheet()['Heading3']))
        
        # Create table data
        table_data = [["Vendor", "Attribute", "Score", "Weight", "Decision"]]
        for score in data['vendor_scores']:
            table_data.append([
                score['vendor'],
                score['attribute_name'],
                score['score'],
                str(score['weight']),
                score['score_decision']
            ])
        
        # Create table
        table = Table(table_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(table)
        story.append(Spacer(1, 20)) 