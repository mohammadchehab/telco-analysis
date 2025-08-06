#!/usr/bin/env python3
"""
Test script to verify that the current_framework import fix works correctly.
This script can be run independently to test the fix.
"""

import json
import sys
import os
from unittest.mock import Mock, patch
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from services.import_service import ImportService
from models.models import Capability, Domain, Attribute, Vendor


def test_current_framework_import_fix():
    """Test that the current_framework import fix works correctly"""
    
    # Sample data that matches the bug report
    sample_data = {
        "capability": "Data Analytics and Machine Learning",
        "analysis_date": "2025-08-04",
        "capability_status": "existing",
        "current_framework": {
            "domains_count": 2,
            "attributes_count": 8,
            "domains": [
                {
                    "domain_name": "Data Management & Integration",
                    "description": "Ensures data is collected, standardized, integrated, and made accessible across the enterprise.",
                    "importance": "high",
                    "attributes": [
                        {
                            "attribute_name": "Master Data Management (MDM)",
                            "description": "Provides golden records for customers, products, suppliers, and other entities.",
                            "importance": "high",
                            "reasoning": "Ensures consistency and reduces duplication across enterprise systems."
                        },
                        {
                            "attribute_name": "Metadata Management",
                            "description": "Tracks business, technical, and operational metadata including lineage.",
                            "importance": "high",
                            "reasoning": "Critical for discoverability and compliance."
                        }
                    ]
                },
                {
                    "domain_name": "Data Engineering",
                    "description": "Builds and manages pipelines to move, transform, and enrich data for analytics and ML.",
                    "importance": "medium",
                    "attributes": [
                        {
                            "attribute_name": "Batch & Streaming Processing",
                            "description": "Enables both scheduled and real-time data processing.",
                            "importance": "high",
                            "reasoning": "Supports a range of use cases from reporting to operational decisioning."
                        }
                    ]
                }
            ]
        },
        "gap_analysis": {
            "missing_domains": [
                {
                    "domain_name": "Generative AI Enablement",
                    "description": "Capabilities focused on prompt engineering, LLM fine-tuning, and RAG pipelines.",
                    "importance": "medium",
                    "reasoning": "Growing demand for generative AI integration with analytics and ML."
                }
            ]
        },
        "market_research": {
            "major_vendors": [
                "Databricks",
                "Snowflake",
                "Microsoft Azure",
                "AWS",
                "Google Cloud"
            ]
        }
    }
    
    # Test 1: File format detection
    print("🔍 Testing file format detection...")
    format_type = ImportService.detect_file_format(sample_data)
    assert format_type == "current_framework", f"Expected 'current_framework', got '{format_type}'"
    print("✅ File format detection passed")
    
    # Test 2: Vendor import functionality
    print("🔍 Testing vendor import functionality...")
    mock_db = Mock()
    mock_db.query.return_value.filter.return_value.first.return_value = None
    
    vendors = ImportService._import_vendors_from_market_research(mock_db, sample_data["market_research"])
    assert len(vendors) == 5, f"Expected 5 vendors, got {len(vendors)}"
    assert "Databricks" in vendors
    assert "Snowflake" in vendors
    assert "Microsoft Azure" in vendors
    assert "AWS" in vendors
    assert "Google Cloud" in vendors
    print("✅ Vendor import functionality passed")
    
    # Test 3: Current framework processing
    print("🔍 Testing current_framework processing...")
    with patch('services.import_service.ImportService._import_vendors_from_market_research') as mock_import_vendors, \
         patch('services.import_service.ImportService.process_domain_import') as mock_process_domains:
        
        mock_import_vendors.return_value = ["Databricks", "Snowflake"]
        mock_process_domains.return_value = {
            'new_domains': 2,
            'new_attributes': 3,
            'total_domains': 2,
            'total_attributes': 3,
            'skipped_domains': 0,
            'skipped_attributes': 0
        }
        
        # Mock capability
        mock_capability = Mock()
        mock_capability.name = "Data Analytics and Machine Learning"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_capability
        
        result = ImportService.process_research_import(mock_db, 1, sample_data)
        
        # Verify that process_domain_import was called with current_framework domains
        mock_process_domains.assert_called_once()
        call_args = mock_process_domains.call_args
        domains_data = call_args[0][2]  # Third argument is domains_data
        
        # Should have 2 domains from current_framework
        assert len(domains_data) == 2, f"Expected 2 domains, got {len(domains_data)}"
        
        # Check first domain
        assert domains_data[0]['domain_name'] == "Data Management & Integration"
        assert len(domains_data[0]['attributes']) == 2
        
        # Check second domain
        assert domains_data[1]['domain_name'] == "Data Engineering"
        assert len(domains_data[1]['attributes']) == 1
        
        # Verify result
        assert result['new_domains'] == 2
        assert result['new_attributes'] == 3
        assert result['total_domains'] == 2
        assert result['total_attributes'] == 3
        assert result['imported_vendors'] == ["Databricks", "Snowflake"]
        
        print("✅ Current framework processing passed")
    
    # Test 4: Priority logic (current_framework over gap_analysis)
    print("🔍 Testing priority logic...")
    with patch('services.import_service.ImportService._import_vendors_from_market_research') as mock_import_vendors, \
         patch('services.import_service.ImportService.process_domain_import') as mock_process_domains:
        
        mock_import_vendors.return_value = []
        mock_process_domains.return_value = {
            'new_domains': 2,
            'new_attributes': 3,
            'total_domains': 2,
            'total_attributes': 3
        }
        
        # Mock capability
        mock_capability = Mock()
        mock_capability.name = "Data Analytics and Machine Learning"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_capability
        
        result = ImportService.process_research_import(mock_db, 1, sample_data)
        
        # Verify that only current_framework domains were processed
        mock_process_domains.assert_called_once()
        call_args = mock_process_domains.call_args
        domains_data = call_args[0][2]
        
        # Should only have current_framework domains, not gap_analysis domains
        domain_names = [d['domain_name'] for d in domains_data]
        assert "Data Management & Integration" in domain_names
        assert "Data Engineering" in domain_names
        assert "Generative AI Enablement" not in domain_names  # This is from gap_analysis
        
        print("✅ Priority logic passed")
    
    print("\n🎉 All tests passed! The current_framework import fix is working correctly.")
    return True


def test_vendor_import_fix():
    """Test that the vendor import fix works correctly"""
    
    print("\n🔍 Testing vendor import fix...")
    
    # Test vendor import with existing vendors
    mock_db = Mock()
    
    # Mock existing vendor
    mock_existing_vendor = Mock()
    mock_existing_vendor.name = "Databricks"
    
    # Configure mock to return existing vendor for first call, None for others
    mock_db.query.return_value.filter.return_value.first.side_effect = [
        mock_existing_vendor,  # Databricks exists
        None,  # Snowflake doesn't exist
        None   # Microsoft Azure doesn't exist
    ]
    
    market_research = {
        "major_vendors": ["Databricks", "Snowflake", "Microsoft Azure"]
    }
    
    result = ImportService._import_vendors_from_market_research(mock_db, market_research)
    
    assert len(result) == 3
    assert "Databricks" in result
    assert "Snowflake" in result
    assert "Microsoft Azure" in result
    # Two new vendors should be added
    assert mock_db.add.call_count == 2
    
    print("✅ Vendor import fix passed")
    return True


if __name__ == "__main__":
    print("🚀 Testing current_framework import fix...")
    
    try:
        test_current_framework_import_fix()
        test_vendor_import_fix()
        print("\n🎯 All verification tests passed! The fixes are working correctly.")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1) 