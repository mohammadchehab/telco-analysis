import pytest
import json
import tempfile
import os
from datetime import datetime
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy.orm import Session

from services.import_service import ImportService
from models.models import Capability, Domain, Attribute, Vendor


class TestImportService:
    """Test cases for ImportService class"""

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session"""
        return Mock(spec=Session)

    @pytest.fixture
    def sample_current_framework_data(self):
        """Sample data for current_framework format"""
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
            "market_research": {
                "major_vendors": [
                    "Databricks",
                    "Snowflake",
                    "Microsoft Azure",
                    "AWS",
                    "Google Cloud"
                ],
                "industry_standards": [
                    "ISO/IEC 38505",
                    "NIST AI RMF",
                    "DAMA-DMBOK"
                ]
            },
            "recommendations": {
                "priority_domains": [
                    "Data Governance & Security",
                    "Machine Learning & Data Science"
                ],
                "priority_attributes": [
                    "Data Quality Management",
                    "MLOps"
                ],
                "framework_completeness": "needs_updates",
                "next_steps": "Expand to include generative AI capabilities"
            }
        }

    @pytest.fixture
    def sample_proposed_framework_data(self):
        """Sample data for proposed_framework format"""
        return {
            "capability": "Billing Processes (Revenue Management)",
            "analysis_date": "2025-08-04",
            "capability_status": "new",
            "proposed_framework": {
                "domains": [
                    {
                        "domain_name": "Data Collection & Mediation",
                        "description": "Collects and normalises usage records from network elements or service platforms.",
                        "importance": "high",
                        "attributes": [
                            {
                                "attribute_name": "Usage Data Collection",
                                "definition": "Gathers raw metering or usage events from network, OSS or application systems.",
                                "tm_forum_mapping": "Manage Billing Events (eTOM Billing Mediation)",
                                "importance": "high"
                            }
                        ]
                    }
                ]
            }
        }

    @pytest.fixture
    def sample_research_file_data(self):
        """Sample data for research_file format"""
        return {
            "capability": "Field Service",
            "analysis_date": "2025-08-05",
            "capability_status": "completed",
            "gap_analysis": {
                "missing_domains": [
                    {
                        "domain_name": "Generative AI Enablement",
                        "description": "Capabilities focused on prompt engineering, LLM fine-tuning, and RAG pipelines.",
                        "importance": "medium",
                        "reasoning": "Growing demand for generative AI integration with analytics and ML."
                    }
                ],
                "missing_attributes": [
                    {
                        "domain": "Data Governance & Security",
                        "attribute_name": "AI Model Governance",
                        "description": "Ensures fairness, bias monitoring, and regulatory compliance for ML/AI models.",
                        "importance": "high",
                        "reasoning": "Essential as AI adoption increases in regulated industries."
                    }
                ]
            },
            "market_research": {
                "major_vendors": [
                    "comarch",
                    "servicenow",
                    "salesforce"
                ],
                "industry_standards": [
                    "TM Forum",
                    "ITIL",
                    "eTOM"
                ]
            },
            "recommendations": {
                "priority_domains": [
                    "Work Order Management",
                    "Scheduling & Dispatch"
                ],
                "priority_attributes": [
                    "Work Order Lifecycle Management",
                    "Preventive Maintenance Management"
                ],
                "framework_completeness": "complete",
                "next_steps": "Continue research on Field Service"
            }
        }

    @pytest.fixture
    def sample_simple_domains_data(self):
        """Sample data for simple_domains format"""
        return {
            "domains": [
                {
                    "domain_name": "Test Domain",
                    "description": "A test domain for unit testing",
                    "importance": "medium",
                    "attributes": [
                        {
                            "attribute_name": "Test Attribute",
                            "definition": "A test attribute for unit testing",
                            "tm_forum_mapping": "TMF123",
                            "importance": "50"
                        }
                    ]
                }
            ]
        }

    def test_detect_file_format_current_framework(self, sample_current_framework_data):
        """Test detection of current_framework format"""
        format_type = ImportService.detect_file_format(sample_current_framework_data)
        assert format_type == "current_framework"

    def test_detect_file_format_proposed_framework(self, sample_proposed_framework_data):
        """Test detection of proposed_framework format"""
        format_type = ImportService.detect_file_format(sample_proposed_framework_data)
        assert format_type == "proposed_framework"

    def test_detect_file_format_research_file(self, sample_research_file_data):
        """Test detection of research_file format"""
        format_type = ImportService.detect_file_format(sample_research_file_data)
        assert format_type == "research_file"

    def test_detect_file_format_simple_domains(self, sample_simple_domains_data):
        """Test detection of simple_domains format"""
        format_type = ImportService.detect_file_format(sample_simple_domains_data)
        assert format_type == "simple_domains"

    def test_detect_file_format_unknown(self):
        """Test detection of unknown format"""
        unknown_data = {"random": "data"}
        format_type = ImportService.detect_file_format(unknown_data)
        assert format_type == "unknown"

    def test_validate_json_structure_valid(self, sample_simple_domains_data):
        """Test validation of valid JSON structure"""
        is_valid = ImportService.validate_json_structure(sample_simple_domains_data)
        assert is_valid is True

    def test_validate_json_structure_invalid(self):
        """Test validation of invalid JSON structure"""
        invalid_data = {"random": "data"}
        is_valid = ImportService.validate_json_structure(invalid_data)
        assert is_valid is False

    def test_validate_json_structure_not_dict(self):
        """Test validation of non-dict data"""
        is_valid = ImportService.validate_json_structure("not a dict")
        assert is_valid is False

    @patch('services.import_service.VersionManager.generate_domain_hash')
    @patch('services.import_service.VersionManager.get_version_string')
    def test_process_domain_import_new_domains(self, mock_get_version, mock_generate_hash, mock_db):
        """Test processing new domains"""
        # Setup mocks
        mock_generate_hash.return_value = "test_hash"
        mock_get_version.return_value = "1.0"
        
        # Mock database queries
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        # Mock capability
        mock_capability = Mock()
        mock_capability.id = 1
        mock_db.query.return_value.filter.return_value.first.return_value = mock_capability
        
        domains_data = [
            {
                "domain_name": "Test Domain",
                "description": "Test description",
                "importance": "medium",
                "attributes": [
                    {
                        "attribute_name": "Test Attribute",
                        "definition": "Test definition",
                        "tm_forum_mapping": "TMF123",
                        "importance": "50"
                    }
                ]
            }
        ]
        
        result = ImportService.process_domain_import(mock_db, 1, domains_data)
        
        assert result['new_domains'] == 1
        assert result['total_domains'] == 1
        assert result['new_attributes'] == 1
        assert result['total_attributes'] == 1

    @patch('services.import_service.VersionManager.generate_domain_hash')
    @patch('services.import_service.VersionManager.get_version_string')
    def test_process_domain_import_existing_domains(self, mock_get_version, mock_generate_hash, mock_db):
        """Test processing existing domains"""
        # Setup mocks
        mock_generate_hash.return_value = "existing_hash"
        mock_get_version.return_value = "1.0"
        
        # Mock existing domain
        mock_existing_domain = Mock()
        mock_existing_domain.content_hash = "existing_hash"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_existing_domain
        
        domains_data = [
            {
                "domain_name": "Existing Domain",
                "description": "Existing description",
                "importance": "medium",
                "attributes": []
            }
        ]
        
        result = ImportService.process_domain_import(mock_db, 1, domains_data)
        
        assert result['skipped_domains'] == 1
        assert result['total_domains'] == 1

    def test_import_vendors_from_market_research_new_vendors(self, mock_db):
        """Test importing new vendors from market research"""
        # Mock database queries
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        market_research = {
            "major_vendors": ["New Vendor 1", "New Vendor 2"]
        }
        
        result = ImportService._import_vendors_from_market_research(mock_db, market_research)
        
        assert len(result) == 2
        assert "New Vendor 1" in result
        assert "New Vendor 2" in result
        assert mock_db.add.call_count == 2

    def test_import_vendors_from_market_research_existing_vendors(self, mock_db):
        """Test importing existing vendors from market research"""
        # Mock existing vendor
        mock_existing_vendor = Mock()
        mock_existing_vendor.name = "Existing Vendor"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_existing_vendor
        
        market_research = {
            "major_vendors": ["Existing Vendor"]
        }
        
        result = ImportService._import_vendors_from_market_research(mock_db, market_research)
        
        assert len(result) == 1
        assert "Existing Vendor" in result
        assert mock_db.add.call_count == 0

    def test_import_vendors_from_market_research_no_vendors(self, mock_db):
        """Test importing when no vendors in market research"""
        market_research = {}
        
        result = ImportService._import_vendors_from_market_research(mock_db, market_research)
        
        assert len(result) == 0
        assert mock_db.add.call_count == 0

    @patch('services.import_service.ImportService._import_vendors_from_market_research')
    @patch('services.import_service.ImportService.process_domain_import')
    def test_process_research_import_current_framework(self, mock_process_domains, mock_import_vendors, mock_db, sample_current_framework_data):
        """Test processing current_framework import"""
        # Setup mocks
        mock_process_domains.return_value = {
            'new_domains': 2,
            'new_attributes': 3,
            'total_domains': 2,
            'total_attributes': 3
        }
        mock_import_vendors.return_value = ["Databricks", "Snowflake"]
        
        # Mock capability
        mock_capability = Mock()
        mock_capability.name = "Data Analytics and Machine Learning"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_capability
        
        result = ImportService.process_research_import(mock_db, 1, sample_current_framework_data)
        
        assert result['new_domains'] == 2
        assert result['new_attributes'] == 3
        assert result['imported_vendors'] == ["Databricks", "Snowflake"]
        assert result['market_vendors'] == ["Databricks", "Snowflake", "Microsoft Azure", "AWS", "Google Cloud"]
        assert result['file_type'] == 'research_file'

    @patch('services.import_service.ImportService._import_vendors_from_market_research')
    @patch('services.import_service.ImportService.process_domain_import')
    def test_process_research_import_proposed_framework(self, mock_process_domains, mock_import_vendors, mock_db, sample_proposed_framework_data):
        """Test processing proposed_framework import"""
        # Setup mocks
        mock_process_domains.return_value = {
            'new_domains': 1,
            'new_attributes': 1,
            'total_domains': 1,
            'total_attributes': 1
        }
        mock_import_vendors.return_value = []
        
        # Mock capability
        mock_capability = Mock()
        mock_capability.name = "Billing Processes (Revenue Management)"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_capability
        
        result = ImportService.process_research_import(mock_db, 1, sample_proposed_framework_data)
        
        assert result['new_domains'] == 1
        assert result['new_attributes'] == 1
        assert result['file_type'] == 'research_file'

    @patch('services.import_service.ImportService._import_vendors_from_market_research')
    @patch('services.import_service.ImportService.process_domain_import')
    def test_process_research_import_gap_analysis(self, mock_process_domains, mock_import_vendors, mock_db, sample_research_file_data):
        """Test processing gap_analysis import"""
        # Setup mocks
        mock_process_domains.return_value = {
            'new_domains': 1,
            'new_attributes': 1,
            'total_domains': 1,
            'total_attributes': 1
        }
        mock_import_vendors.return_value = ["comarch", "servicenow"]
        
        # Mock capability
        mock_capability = Mock()
        mock_capability.name = "Field Service"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_capability
        
        result = ImportService.process_research_import(mock_db, 1, sample_research_file_data)
        
        assert result['new_domains'] == 1
        assert result['new_attributes'] == 1
        assert result['imported_vendors'] == ["comarch", "servicenow"]
        assert result['file_type'] == 'research_file'

    def test_process_research_import_no_framework_data(self, mock_db):
        """Test processing import with no framework data"""
        data = {
            "capability": "Test Capability",
            "market_research": {
                "major_vendors": ["Test Vendor"]
            }
        }
        
        # Mock capability
        mock_capability = Mock()
        mock_capability.name = "Test Capability"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_capability
        
        result = ImportService.process_research_import(mock_db, 1, data)
        
        assert result['total_domains'] == 0
        assert result['total_attributes'] == 0
        assert result['file_type'] == 'research_file'

    def test_get_import_history(self, mock_db):
        """Test getting import history"""
        # Mock import batches
        mock_batch1 = Mock()
        mock_batch1.import_batch = "batch_1"
        mock_batch1.import_date = datetime.now()
        
        mock_batch2 = Mock()
        mock_batch2.import_batch = "batch_2"
        mock_batch2.import_date = datetime.now()
        
        mock_db.query.return_value.filter.return_value.distinct.return_value.order_by.return_value.all.return_value = [mock_batch1, mock_batch2]
        
        # Mock counts
        mock_db.query.return_value.filter.return_value.count.return_value = 5
        
        result = ImportService.get_import_history(mock_db, 1)
        
        assert len(result) == 2
        assert result[0]['import_batch'] == "batch_1"
        assert result[1]['import_batch'] == "batch_2" 