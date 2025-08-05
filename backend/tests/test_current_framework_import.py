import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy.orm import Session

from services.import_service import ImportService
from models.models import Capability, Domain, Attribute


class TestCurrentFrameworkImport:
    """Test cases specifically for current_framework import functionality"""

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session"""
        return Mock(spec=Session)

    @pytest.fixture
    def sample_current_framework_data(self):
        """Sample current_framework data that matches the bug report"""
        return {
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

    @patch('services.import_service.ImportService._import_vendors_from_market_research')
    @patch('services.import_service.ImportService.process_domain_import')
    def test_current_framework_domains_are_processed(self, mock_process_domains, mock_import_vendors, mock_db, sample_current_framework_data):
        """Test that current_framework domains are properly processed"""
        # Setup mocks
        mock_process_domains.return_value = {
            'new_domains': 2,
            'new_attributes': 3,
            'total_domains': 2,
            'total_attributes': 3,
            'skipped_domains': 0,
            'skipped_attributes': 0
        }
        mock_import_vendors.return_value = ["Databricks", "Snowflake"]
        
        # Mock capability
        mock_capability = Mock()
        mock_capability.name = "Data Analytics and Machine Learning"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_capability
        
        result = ImportService.process_research_import(mock_db, 1, sample_current_framework_data)
        
        # Verify that process_domain_import was called with the correct domains
        mock_process_domains.assert_called_once()
        call_args = mock_process_domains.call_args
        domains_data = call_args[0][2]  # Third argument is domains_data
        
        # Should have 2 domains from current_framework
        assert len(domains_data) == 2
        
        # Check first domain
        assert domains_data[0]['domain_name'] == "Data Management & Integration"
        assert domains_data[0]['description'] == "Ensures data is collected, standardized, integrated, and made accessible across the enterprise."
        assert domains_data[0]['importance'] == "high"
        assert len(domains_data[0]['attributes']) == 2
        
        # Check second domain
        assert domains_data[1]['domain_name'] == "Data Engineering"
        assert domains_data[1]['description'] == "Builds and manages pipelines to move, transform, and enrich data for analytics and ML."
        assert domains_data[1]['importance'] == "medium"
        assert len(domains_data[1]['attributes']) == 1
        
        # Verify result
        assert result['new_domains'] == 2
        assert result['new_attributes'] == 3
        assert result['total_domains'] == 2
        assert result['total_attributes'] == 3

    @patch('services.import_service.ImportService._import_vendors_from_market_research')
    @patch('services.import_service.ImportService.process_domain_import')
    def test_current_framework_takes_priority_over_gap_analysis(self, mock_process_domains, mock_import_vendors, mock_db, sample_current_framework_data):
        """Test that current_framework takes priority over gap_analysis"""
        # Setup mocks
        mock_process_domains.return_value = {
            'new_domains': 2,
            'new_attributes': 3,
            'total_domains': 2,
            'total_attributes': 3
        }
        mock_import_vendors.return_value = []
        
        # Mock capability
        mock_capability = Mock()
        mock_capability.name = "Data Analytics and Machine Learning"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_capability
        
        result = ImportService.process_research_import(mock_db, 1, sample_current_framework_data)
        
        # Verify that process_domain_import was called with current_framework domains only
        mock_process_domains.assert_called_once()
        call_args = mock_process_domains.call_args
        domains_data = call_args[0][2]
        
        # Should only have current_framework domains, not gap_analysis domains
        assert len(domains_data) == 2
        domain_names = [d['domain_name'] for d in domains_data]
        assert "Data Management & Integration" in domain_names
        assert "Data Engineering" in domain_names
        assert "Generative AI Enablement" not in domain_names  # This is from gap_analysis

    @patch('services.import_service.ImportService._import_vendors_from_market_research')
    @patch('services.import_service.ImportService.process_domain_import')
    def test_current_framework_attributes_are_processed_correctly(self, mock_process_domains, mock_import_vendors, mock_db, sample_current_framework_data):
        """Test that current_framework attributes are processed correctly"""
        # Setup mocks
        mock_process_domains.return_value = {
            'new_domains': 2,
            'new_attributes': 3,
            'total_domains': 2,
            'total_attributes': 3
        }
        mock_import_vendors.return_value = []
        
        # Mock capability
        mock_capability = Mock()
        mock_capability.name = "Data Analytics and Machine Learning"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_capability
        
        result = ImportService.process_research_import(mock_db, 1, sample_current_framework_data)
        
        # Verify that process_domain_import was called with correct attributes
        mock_process_domains.assert_called_once()
        call_args = mock_process_domains.call_args
        domains_data = call_args[0][2]
        
        # Check attributes in first domain
        first_domain_attrs = domains_data[0]['attributes']
        assert len(first_domain_attrs) == 2
        
        # Check first attribute
        assert first_domain_attrs[0]['attribute_name'] == "Master Data Management (MDM)"
        assert first_domain_attrs[0]['definition'] == "Provides golden records for customers, products, suppliers, and other entities."
        assert first_domain_attrs[0]['importance'] == "high"
        
        # Check second attribute
        assert first_domain_attrs[1]['attribute_name'] == "Metadata Management"
        assert first_domain_attrs[1]['definition'] == "Tracks business, technical, and operational metadata including lineage."
        assert first_domain_attrs[1]['importance'] == "high"

    @patch('services.import_service.ImportService._import_vendors_from_market_research')
    @patch('services.import_service.ImportService.process_domain_import')
    def test_current_framework_with_no_attributes(self, mock_process_domains, mock_import_vendors, mock_db):
        """Test current_framework import with domains that have no attributes"""
        data = {
            "capability": "Test Capability",
            "current_framework": {
                "domains": [
                    {
                        "domain_name": "Test Domain",
                        "description": "Test description",
                        "importance": "medium",
                        "attributes": []
                    }
                ]
            }
        }
        
        # Setup mocks
        mock_process_domains.return_value = {
            'new_domains': 1,
            'new_attributes': 0,
            'total_domains': 1,
            'total_attributes': 0
        }
        mock_import_vendors.return_value = []
        
        # Mock capability
        mock_capability = Mock()
        mock_capability.name = "Test Capability"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_capability
        
        result = ImportService.process_research_import(mock_db, 1, data)
        
        # Verify that process_domain_import was called with correct data
        mock_process_domains.assert_called_once()
        call_args = mock_process_domains.call_args
        domains_data = call_args[0][2]
        
        assert len(domains_data) == 1
        assert domains_data[0]['domain_name'] == "Test Domain"
        assert len(domains_data[0]['attributes']) == 0

    @patch('services.import_service.ImportService._import_vendors_from_market_research')
    @patch('services.import_service.ImportService.process_domain_import')
    def test_current_framework_detection_priority(self, mock_process_domains, mock_import_vendors, mock_db):
        """Test that current_framework format is detected with priority"""
        data = {
            "capability": "Test Capability",
            "current_framework": {
                "domains": [
                    {
                        "domain_name": "Current Framework Domain",
                        "description": "From current framework",
                        "attributes": []
                    }
                ]
            },
            "gap_analysis": {
                "missing_domains": [
                    {
                        "domain_name": "Gap Analysis Domain",
                        "description": "From gap analysis",
                        "attributes": []
                    }
                ]
            }
        }
        
        # Setup mocks
        mock_process_domains.return_value = {
            'new_domains': 1,
            'new_attributes': 0,
            'total_domains': 1,
            'total_attributes': 0
        }
        mock_import_vendors.return_value = []
        
        # Mock capability
        mock_capability = Mock()
        mock_capability.name = "Test Capability"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_capability
        
        result = ImportService.process_research_import(mock_db, 1, data)
        
        # Verify that only current_framework domains were processed
        mock_process_domains.assert_called_once()
        call_args = mock_process_domains.call_args
        domains_data = call_args[0][2]
        
        assert len(domains_data) == 1
        assert domains_data[0]['domain_name'] == "Current Framework Domain"
        assert domains_data[0]['description'] == "From current framework"

    def test_current_framework_format_detection(self, sample_current_framework_data):
        """Test that current_framework format is correctly detected"""
        format_type = ImportService.detect_file_format(sample_current_framework_data)
        assert format_type == "current_framework"

    @patch('services.import_service.ImportService._import_vendors_from_market_research')
    @patch('services.import_service.ImportService.process_domain_import')
    def test_current_framework_import_commits_transaction(self, mock_process_domains, mock_import_vendors, mock_db, sample_current_framework_data):
        """Test that the transaction is committed after current_framework import"""
        # Setup mocks
        mock_process_domains.return_value = {
            'new_domains': 2,
            'new_attributes': 3,
            'total_domains': 2,
            'total_attributes': 3
        }
        mock_import_vendors.return_value = []
        
        # Mock capability
        mock_capability = Mock()
        mock_capability.name = "Data Analytics and Machine Learning"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_capability
        
        result = ImportService.process_research_import(mock_db, 1, sample_current_framework_data)
        
        # Verify that commit was called
        mock_db.commit.assert_called() 