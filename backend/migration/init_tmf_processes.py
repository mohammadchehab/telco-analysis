#!/usr/bin/env python3
"""
Initialize TMF Business Process Framework processes
"""

import sys
import os
from sqlalchemy.orm import Session
from sqlalchemy import text

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import engine, get_db
from models.models import TMFProcess

# TMF Framework processes based on the image
TMF_PROCESSES = [
    # Common Domain
    {"process_id": "COMM_001", "name": "Catalogs Management", "domain": "Common", "phase": "Strategy to Readiness", "description": "Management of catalogs across the organization"},
    {"process_id": "COMM_002", "name": "Capacity Management", "domain": "Common", "phase": "Strategy to Readiness", "description": "Management of organizational capacity"},
    {"process_id": "COMM_003", "name": "Configuration Specification", "domain": "Common", "phase": "Strategy to Readiness", "description": "Specification of configurations"},
    {"process_id": "COMM_004", "name": "Enterprise Audit Management", "domain": "Common", "phase": "Strategy to Readiness", "description": "Management of enterprise audits"},
    
    # Market Sales Domain
    {"process_id": "MS_001", "name": "Market Strategy & Policy", "domain": "Market Sales", "phase": "Strategy to Readiness", "description": "Development of market strategy and policies"},
    {"process_id": "MS_002", "name": "Sales Strategy & Planning", "domain": "Market Sales", "phase": "Strategy to Readiness", "description": "Sales strategy development and planning"},
    {"process_id": "MS_003", "name": "Sales Forecasting", "domain": "Market Sales", "phase": "Strategy to Readiness", "description": "Sales forecasting and projections"},
    {"process_id": "MS_004", "name": "Brand Management", "domain": "Market Sales", "phase": "Strategy to Readiness", "description": "Brand management and positioning"},
    {"process_id": "MS_005", "name": "Market Research", "domain": "Market Sales", "phase": "Strategy to Readiness", "description": "Market research and analysis"},
    {"process_id": "MS_006", "name": "Sales Development", "domain": "Market Sales", "phase": "Strategy to Readiness", "description": "Sales development activities"},
    {"process_id": "MS_007", "name": "Market Sales Support", "domain": "Market Sales", "phase": "Operations", "description": "Support for market sales operations"},
    {"process_id": "MS_008", "name": "Loyalty Program Management", "domain": "Market Sales", "phase": "Operations", "description": "Management of customer loyalty programs"},
    {"process_id": "MS_009", "name": "Sales Channel Management", "domain": "Market Sales", "phase": "Operations", "description": "Management of sales channels"},
    {"process_id": "MS_010", "name": "Selling", "domain": "Market Sales", "phase": "Operations", "description": "Direct selling activities"},
    {"process_id": "MS_011", "name": "Contact/Lead/Prospect Management", "domain": "Market Sales", "phase": "Operations", "description": "Management of contacts, leads, and prospects"},
    {"process_id": "MS_012", "name": "Market Performance Management", "domain": "Market Sales", "phase": "Operations", "description": "Management of market performance metrics"},
    {"process_id": "MS_013", "name": "Sales Performance Management", "domain": "Market Sales", "phase": "Operations", "description": "Management of sales performance"},
    {"process_id": "MS_014", "name": "Marketing Campaign Management", "domain": "Market Sales", "phase": "Operations", "description": "Management of marketing campaigns"},
    {"process_id": "MS_015", "name": "Marketing Communications and Advertising", "domain": "Market Sales", "phase": "Operations", "description": "Marketing communications and advertising activities"},
    
    # Customer Domain
    {"process_id": "CUST_001", "name": "Customer Support", "domain": "Customer", "phase": "Operations", "description": "Customer support and assistance"},
    {"process_id": "CUST_002", "name": "Order Handling", "domain": "Customer", "phase": "Operations", "description": "Processing and management of customer orders"},
    {"process_id": "CUST_003", "name": "Problem Handling", "domain": "Customer", "phase": "Operations", "description": "Handling of customer problems and issues"},
    {"process_id": "CUST_004", "name": "Customer QoS/SLA Management", "domain": "Customer", "phase": "Operations", "description": "Management of customer quality of service and SLAs"},
    {"process_id": "CUST_005", "name": "Customer Experience Management", "domain": "Customer", "phase": "Operations", "description": "Management of customer experience"},
    {"process_id": "CUST_006", "name": "Customer Interaction Management", "domain": "Customer", "phase": "Operations", "description": "Management of customer interactions"},
    {"process_id": "CUST_007", "name": "Customer Management", "domain": "Customer", "phase": "Operations", "description": "Overall customer management"},
    {"process_id": "CUST_008", "name": "Customer Information Management", "domain": "Customer", "phase": "Operations", "description": "Management of customer information"},
    {"process_id": "CUST_009", "name": "Bill Invoice Management", "domain": "Customer", "phase": "Billing & Revenue Management", "description": "Management of bill invoices"},
    {"process_id": "CUST_010", "name": "Bill Inquiry Handling", "domain": "Customer", "phase": "Billing & Revenue Management", "description": "Handling of bill inquiries"},
    {"process_id": "CUST_011", "name": "Charging", "domain": "Customer", "phase": "Billing & Revenue Management", "description": "Charging and billing processes"},
    {"process_id": "CUST_012", "name": "Pricing, Discounting, and Agreements", "domain": "Customer", "phase": "Billing & Revenue Management", "description": "Pricing, discounting, and agreement management"},
    {"process_id": "CUST_013", "name": "Bill Payments & Receivables Management", "domain": "Customer", "phase": "Billing & Revenue Management", "description": "Management of bill payments and receivables"},
    {"process_id": "CUST_014", "name": "Billing Events Management", "domain": "Customer", "phase": "Billing & Revenue Management", "description": "Management of billing events"},
    {"process_id": "CUST_015", "name": "Customer Inventory Management", "domain": "Customer", "phase": "Billing & Revenue Management", "description": "Management of customer inventory"},
    
    # Product Domain
    {"process_id": "PROD_001", "name": "Product & Offer Portfolio Planning", "domain": "Product", "phase": "Strategy to Readiness", "description": "Planning of product and offer portfolios"},
    {"process_id": "PROD_002", "name": "Product & Offer Capability Delivery", "domain": "Product", "phase": "Strategy to Readiness", "description": "Delivery of product and offer capabilities"},
    {"process_id": "PROD_003", "name": "Product Capacity Management", "domain": "Product", "phase": "Strategy to Readiness", "description": "Management of product capacity"},
    {"process_id": "PROD_004", "name": "Product Specification & Offering Development", "domain": "Product", "phase": "Operations", "description": "Development of product specifications and offerings"},
    {"process_id": "PROD_005", "name": "Product Inventory Management", "domain": "Product", "phase": "Operations", "description": "Management of product inventory"},
    {"process_id": "PROD_006", "name": "Product Support", "domain": "Product", "phase": "Operations", "description": "Support for products"},
    {"process_id": "PROD_007", "name": "Product Configuration", "domain": "Product", "phase": "Operations", "description": "Configuration of products"},
    {"process_id": "PROD_008", "name": "Product Offering Purchasing", "domain": "Product", "phase": "Operations", "description": "Purchasing of product offerings"},
    {"process_id": "PROD_009", "name": "Product Performance Management", "domain": "Product", "phase": "Operations", "description": "Management of product performance"},
    
    # Service Domain
    {"process_id": "SERV_001", "name": "Service Strategy & Planning", "domain": "Service", "phase": "Strategy to Readiness", "description": "Service strategy and planning"},
    {"process_id": "SERV_002", "name": "Service Capability Delivery", "domain": "Service", "phase": "Strategy to Readiness", "description": "Delivery of service capabilities"},
    {"process_id": "SERV_003", "name": "Service Development & Retirement", "domain": "Service", "phase": "Operations", "description": "Development and retirement of services"},
    {"process_id": "SERV_004", "name": "SM&O Support & Readiness", "domain": "Service", "phase": "Operations", "description": "Service management and operations support"},
    {"process_id": "SERV_005", "name": "Service Configuration", "domain": "Service", "phase": "Operations", "description": "Configuration of services"},
    {"process_id": "SERV_006", "name": "Service Problem Management", "domain": "Service", "phase": "Operations", "description": "Management of service problems"},
    {"process_id": "SERV_007", "name": "Service Quality Management", "domain": "Service", "phase": "Operations", "description": "Management of service quality"},
    {"process_id": "SERV_008", "name": "Service Guiding & Mediation", "domain": "Service", "phase": "Billing & Revenue Management", "description": "Service guiding and mediation"},
    
    # Resource Domain
    {"process_id": "RES_001", "name": "Resource Strategy & Planning", "domain": "Resource", "phase": "Strategy to Readiness", "description": "Resource strategy and planning"},
    {"process_id": "RES_002", "name": "Resource Capability Delivery", "domain": "Resource", "phase": "Strategy to Readiness", "description": "Delivery of resource capabilities"},
    {"process_id": "RES_003", "name": "Resource Development & Retirement", "domain": "Resource", "phase": "Operations", "description": "Development and retirement of resources"},
    {"process_id": "RES_004", "name": "RM&O Support & Readiness", "domain": "Resource", "phase": "Operations", "description": "Resource management and operations support"},
    {"process_id": "RES_005", "name": "Workforce Management", "domain": "Resource", "phase": "Operations", "description": "Management of workforce"},
    {"process_id": "RES_006", "name": "Resource Provisioning", "domain": "Resource", "phase": "Operations", "description": "Provisioning of resources"},
    {"process_id": "RES_007", "name": "Resource Trouble Management", "domain": "Resource", "phase": "Operations", "description": "Management of resource troubles"},
    {"process_id": "RES_008", "name": "Resource Performance Management", "domain": "Resource", "phase": "Operations", "description": "Management of resource performance"},
    {"process_id": "RES_009", "name": "Resource Data Collection & Distribution", "domain": "Resource", "phase": "Operations", "description": "Collection and distribution of resource data"},
    {"process_id": "RES_010", "name": "Resource Mediation & Reporting", "domain": "Resource", "phase": "Billing & Revenue Management", "description": "Resource mediation and reporting"},
    
    # Business Partner Domain
    {"process_id": "BP_001", "name": "Party Strategy & Planning", "domain": "Business Partner", "phase": "Strategy to Readiness", "description": "Business partner strategy and planning"},
    {"process_id": "BP_002", "name": "Party Tender Management", "domain": "Business Partner", "phase": "Strategy to Readiness", "description": "Management of business partner tenders"},
    {"process_id": "BP_003", "name": "Party Offering Development & Retirement", "domain": "Business Partner", "phase": "Operations", "description": "Development and retirement of partner offerings"},
    {"process_id": "BP_004", "name": "Party Support", "domain": "Business Partner", "phase": "Operations", "description": "Support for business partners"},
    {"process_id": "BP_005", "name": "Party Order Handling", "domain": "Business Partner", "phase": "Operations", "description": "Handling of partner orders"},
    {"process_id": "BP_006", "name": "Party Problem Handling", "domain": "Business Partner", "phase": "Operations", "description": "Handling of partner problems"},
    {"process_id": "BP_007", "name": "Party Performance Management", "domain": "Business Partner", "phase": "Operations", "description": "Management of partner performance"},
    {"process_id": "BP_008", "name": "Party Inventory Management", "domain": "Business Partner", "phase": "Operations", "description": "Management of partner inventory"},
    {"process_id": "BP_009", "name": "Party Privacy Management", "domain": "Business Partner", "phase": "Operations", "description": "Management of partner privacy"},
    {"process_id": "BP_010", "name": "Party Training", "domain": "Business Partner", "phase": "Operations", "description": "Training for business partners"},
    {"process_id": "BP_011", "name": "Party Interaction Management", "domain": "Business Partner", "phase": "Operations", "description": "Management of partner interactions"},
    {"process_id": "BP_012", "name": "Party Agreement Management", "domain": "Business Partner", "phase": "Operations", "description": "Management of partner agreements"},
    {"process_id": "BP_013", "name": "Party Relationship Development & Retirement", "domain": "Business Partner", "phase": "Operations", "description": "Development and retirement of partner relationships"},
    {"process_id": "BP_014", "name": "Party Bill/Invoice Management", "domain": "Business Partner", "phase": "Billing & Revenue Management", "description": "Management of partner bills and invoices"},
    {"process_id": "BP_015", "name": "Party Charging", "domain": "Business Partner", "phase": "Billing & Revenue Management", "description": "Charging for partner services"},
    {"process_id": "BP_016", "name": "Party Billing Events Management", "domain": "Business Partner", "phase": "Billing & Revenue Management", "description": "Management of partner billing events"},
    {"process_id": "BP_017", "name": "Party Bill Payments & Receivables", "domain": "Business Partner", "phase": "Billing & Revenue Management", "description": "Management of partner bill payments and receivables"},
    {"process_id": "BP_018", "name": "Party Revenue Sharing and Settlement", "domain": "Business Partner", "phase": "Billing & Revenue Management", "description": "Revenue sharing and settlement with partners"},
    {"process_id": "BP_019", "name": "Party Bill Inquiry Handling", "domain": "Business Partner", "phase": "Billing & Revenue Management", "description": "Handling of partner bill inquiries"},
    
    # Enterprise Domain
    {"process_id": "ENT_001", "name": "Strategic & Enterprise Planning", "domain": "Enterprise", "phase": "Strategy to Readiness", "description": "Strategic and enterprise planning"},
    {"process_id": "ENT_002", "name": "Enterprise Risk Management", "domain": "Enterprise", "phase": "Strategy to Readiness", "description": "Management of enterprise risks"},
    {"process_id": "ENT_003", "name": "Enterprise Effectiveness Management", "domain": "Enterprise", "phase": "Strategy to Readiness", "description": "Management of enterprise effectiveness"},
    {"process_id": "ENT_004", "name": "Knowledge & Research Management", "domain": "Enterprise", "phase": "Strategy to Readiness", "description": "Management of knowledge and research"},
    {"process_id": "ENT_005", "name": "Financial & Asset Management", "domain": "Enterprise", "phase": "Strategy to Readiness", "description": "Management of financial and asset resources"},
    {"process_id": "ENT_006", "name": "Stakeholder & External Relations", "domain": "Enterprise", "phase": "Strategy to Readiness", "description": "Management of stakeholder and external relations"},
    {"process_id": "ENT_007", "name": "Human Resources Management", "domain": "Enterprise", "phase": "Strategy to Readiness", "description": "Management of human resources"},
    {"process_id": "ENT_008", "name": "Common Enterprise Processes", "domain": "Enterprise", "phase": "Strategy to Readiness", "description": "Common enterprise processes"},
]

def check_tmf_processes_exist():
    """Check if TMF processes already exist in the database"""
    try:
        db = next(get_db())
        existing_count = db.query(TMFProcess).count()
        db.close()
        return existing_count > 0
    except Exception as e:
        print(f"⚠️  Error checking TMF processes: {e}")
        return False

def init_tmf_processes():
    """Initialize TMF processes in the database"""
    try:
        # Check if processes already exist
        if check_tmf_processes_exist():
            print("✅ TMF processes already exist. Skipping initialization.")
            return True
        
        db = next(get_db())
        
        # Create tables first
        from models.models import Base
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created/verified")
        
        # Create processes
        processes = []
        for process_data in TMF_PROCESSES:
            process = TMFProcess(
                process_id=process_data["process_id"],
                name=process_data["name"],
                description=process_data["description"],
                domain=process_data["domain"],
                phase=process_data["phase"],
                position_x=0,
                position_y=0,
                size_width=100,
                size_height=60
            )
            processes.append(process)
        
        db.add_all(processes)
        db.commit()
        
        print(f"✅ Successfully created {len(processes)} TMF processes")
        return True
        
    except Exception as e:
        if 'db' in locals():
            db.rollback()
        print(f"❌ Error creating TMF processes: {e}")
        return False
    finally:
        if 'db' in locals():
            db.close()

if __name__ == "__main__":
    print("🚀 Initializing TMF Business Process Framework...")
    success = init_tmf_processes()
    if success:
        print("✅ TMF initialization complete!")
    else:
        print("❌ TMF initialization failed!")
        sys.exit(1) 