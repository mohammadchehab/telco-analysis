import pytest
import json
import tempfile
import os
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app import app
from services.import_service import ImportService
from models.models import Capability, Domain, Attribute, Vendor


class TestImportAPI:
    """Integration tests for import API endpoints"""

    @pytest.fixture
    def client(self):
        """Create a test client"""
        return TestClient(app)

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session"""
        return Mock(spec=Session)

    @pytest.fixture
    def sample_current_framework_file(self):
        """Create a temporary file with current_framework data"""
        data = {
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
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(data, f)
            temp_file_path = f.name
        
        yield temp_file_path
        
        # Cleanup
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

    @pytest.fixture
    def sample_proposed_framework_file(self):
        """Create a temporary file with proposed_framework data"""
        data = {
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
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(data, f)
            temp_file_path = f.name
        
        yield temp_file_path
        
        # Cleanup
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

    @pytest.fixture
    def sample_research_file(self):
        """Create a temporary file with research_file data"""
        data = {
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
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(data, f)
            temp_file_path = f.name
        
        yield temp_file_path
        
        # Cleanup
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

    @pytest.fixture
    def sample_simple_domains_file(self):
        """Create a temporary file with simple_domains data"""
        data = {
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
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(data, f)
            temp_file_path = f.name
        
        yield temp_file_path
        
        # Cleanup
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

    @patch('api.imports.get_db')
    @patch('api.imports.get_current_user')
    def test_import_current_framework_success(self, mock_get_current_user, mock_get_db, client, sample_current_framework_file, mock_db):
        """Test successful import of current_framework file"""
        # Setup mocks
        mock_get_current_user.return_value = {"id": 1, "username": "testuser"}
        mock_get_db.return_value = mock_db
        
        # Mock capability
        mock_capability = Mock()
        mock_capability.id = 1
        mock_capability.name = "Data Analytics and Machine Learning"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_capability
        
        # Mock domain and attribute queries
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        with open(sample_current_framework_file, 'rb') as f:
            response = client.post(
                "/api/imports/capabilities/1/domains",
                files={"file": ("test.json", f, "application/json")}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "import_batch" in data["data"]
        assert data["data"]["file_type"] == "research_file"

    @patch('api.imports.get_db')
    @patch('api.imports.get_current_user')
    def test_import_proposed_framework_success(self, mock_get_current_user, mock_get_db, client, sample_proposed_framework_file, mock_db):
        """Test successful import of proposed_framework file"""
        # Setup mocks
        mock_get_current_user.return_value = {"id": 1, "username": "testuser"}
        mock_get_db.return_value = mock_db
        
        # Mock capability
        mock_capability = Mock()
        mock_capability.id = 1
        mock_capability.name = "Billing Processes (Revenue Management)"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_capability
        
        # Mock domain and attribute queries
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        with open(sample_proposed_framework_file, 'rb') as f:
            response = client.post(
                "/api/imports/capabilities/1/domains",
                files={"file": ("test.json", f, "application/json")}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "import_batch" in data["data"]
        assert data["data"]["file_type"] == "research_file"

    @patch('api.imports.get_db')
    @patch('api.imports.get_current_user')
    def test_import_research_file_success(self, mock_get_current_user, mock_get_db, client, sample_research_file, mock_db):
        """Test successful import of research_file"""
        # Setup mocks
        mock_get_current_user.return_value = {"id": 1, "username": "testuser"}
        mock_get_db.return_value = mock_db
        
        # Mock capability
        mock_capability = Mock()
        mock_capability.id = 1
        mock_capability.name = "Field Service"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_capability
        
        # Mock domain and attribute queries
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        with open(sample_research_file, 'rb') as f:
            response = client.post(
                "/api/imports/capabilities/1/domains",
                files={"file": ("test.json", f, "application/json")}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "import_batch" in data["data"]
        assert data["data"]["file_type"] == "research_file"

    @patch('api.imports.get_db')
    @patch('api.imports.get_current_user')
    def test_import_simple_domains_success(self, mock_get_current_user, mock_get_db, client, sample_simple_domains_file, mock_db):
        """Test successful import of simple_domains file"""
        # Setup mocks
        mock_get_current_user.return_value = {"id": 1, "username": "testuser"}
        mock_get_db.return_value = mock_db
        
        # Mock capability
        mock_capability = Mock()
        mock_capability.id = 1
        mock_capability.name = "Test Capability"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_capability
        
        # Mock domain and attribute queries
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        with open(sample_simple_domains_file, 'rb') as f:
            response = client.post(
                "/api/imports/capabilities/1/domains",
                files={"file": ("test.json", f, "application/json")}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "import_batch" in data["data"]

    @patch('api.imports.get_db')
    @patch('api.imports.get_current_user')
    def test_import_capability_not_found(self, mock_get_current_user, mock_get_db, client, sample_current_framework_file, mock_db):
        """Test import when capability doesn't exist"""
        # Setup mocks
        mock_get_current_user.return_value = {"id": 1, "username": "testuser"}
        mock_get_db.return_value = mock_db
        
        # Mock capability not found
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        with open(sample_current_framework_file, 'rb') as f:
            response = client.post(
                "/api/imports/capabilities/999/domains",
                files={"file": ("test.json", f, "application/json")}
            )
        
        assert response.status_code == 404
        data = response.json()
        assert data["success"] is False
        assert "not found" in data["error"].lower()

    @patch('api.imports.get_db')
    @patch('api.imports.get_current_user')
    def test_import_invalid_file_format(self, mock_get_current_user, mock_get_db, client, mock_db):
        """Test import with invalid file format"""
        # Setup mocks
        mock_get_current_user.return_value = {"id": 1, "username": "testuser"}
        mock_get_db.return_value = mock_db
        
        # Mock capability
        mock_capability = Mock()
        mock_capability.id = 1
        mock_capability.name = "Test Capability"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_capability
        
        # Create invalid JSON file
        invalid_data = {"random": "data"}
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(invalid_data, f)
            temp_file_path = f.name
        
        try:
            with open(temp_file_path, 'rb') as f:
                response = client.post(
                    "/api/imports/capabilities/1/domains",
                    files={"file": ("test.json", f, "application/json")}
                )
            
            assert response.status_code == 400
            data = response.json()
            assert data["success"] is False
            assert "unsupported" in data["error"].lower()
        finally:
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)

    @patch('api.imports.get_db')
    @patch('api.imports.get_current_user')
    def test_import_malformed_json(self, mock_get_current_user, mock_get_db, client, mock_db):
        """Test import with malformed JSON"""
        # Setup mocks
        mock_get_current_user.return_value = {"id": 1, "username": "testuser"}
        mock_get_db.return_value = mock_db
        
        # Mock capability
        mock_capability = Mock()
        mock_capability.id = 1
        mock_capability.name = "Test Capability"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_capability
        
        # Create malformed JSON file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            f.write('{"invalid": json}')
            temp_file_path = f.name
        
        try:
            with open(temp_file_path, 'rb') as f:
                response = client.post(
                    "/api/imports/capabilities/1/domains",
                    files={"file": ("test.json", f, "application/json")}
                )
            
            assert response.status_code == 400
            data = response.json()
            assert data["success"] is False
            assert "json" in data["error"].lower()
        finally:
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)

    @patch('api.imports.get_db')
    @patch('api.imports.get_current_user')
    def test_import_vendor_creation(self, mock_get_current_user, mock_get_db, client, sample_current_framework_file, mock_db):
        """Test that vendors are created during import"""
        # Setup mocks
        mock_get_current_user.return_value = {"id": 1, "username": "testuser"}
        mock_get_db.return_value = mock_db
        
        # Mock capability
        mock_capability = Mock()
        mock_capability.id = 1
        mock_capability.name = "Data Analytics and Machine Learning"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_capability
        
        # Mock domain and attribute queries
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        with open(sample_current_framework_file, 'rb') as f:
            response = client.post(
                "/api/imports/capabilities/1/domains",
                files={"file": ("test.json", f, "application/json")}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # Verify that vendors were processed
        assert "market_vendors" in data["data"]
        assert len(data["data"]["market_vendors"]) > 0

    @patch('api.imports.get_db')
    @patch('api.imports.get_current_user')
    def test_import_with_existing_domains(self, mock_get_current_user, mock_get_db, client, sample_current_framework_file, mock_db):
        """Test import when domains already exist"""
        # Setup mocks
        mock_get_current_user.return_value = {"id": 1, "username": "testuser"}
        mock_get_db.return_value = mock_db
        
        # Mock capability
        mock_capability = Mock()
        mock_capability.id = 1
        mock_capability.name = "Data Analytics and Machine Learning"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_capability
        
        # Mock existing domain
        mock_existing_domain = Mock()
        mock_existing_domain.content_hash = "existing_hash"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_existing_domain
        
        with open(sample_current_framework_file, 'rb') as f:
            response = client.post(
                "/api/imports/capabilities/1/domains",
                files={"file": ("test.json", f, "application/json")}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["skipped_domains"] > 0

    def test_import_endpoint_requires_authentication(self, client):
        """Test that import endpoint requires authentication"""
        response = client.post("/api/imports/capabilities/1/domains")
        assert response.status_code == 401

    @patch('api.imports.get_db')
    @patch('api.imports.get_current_user')
    def test_import_with_large_file(self, mock_get_current_user, mock_get_db, client, mock_db):
        """Test import with a large file"""
        # Setup mocks
        mock_get_current_user.return_value = {"id": 1, "username": "testuser"}
        mock_get_db.return_value = mock_db
        
        # Mock capability
        mock_capability = Mock()
        mock_capability.id = 1
        mock_capability.name = "Test Capability"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_capability
        
        # Mock domain and attribute queries
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        # Create a large JSON file
        large_data = {
            "capability": "Large Test Capability",
            "current_framework": {
                "domains": []
            }
        }
        
        # Add many domains and attributes
        for i in range(100):
            domain = {
                "domain_name": f"Domain {i}",
                "description": f"Description for domain {i}",
                "importance": "medium",
                "attributes": []
            }
            for j in range(10):
                attribute = {
                    "attribute_name": f"Attribute {j}",
                    "description": f"Description for attribute {j}",
                    "importance": "50"
                }
                domain["attributes"].append(attribute)
            large_data["current_framework"]["domains"].append(domain)
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(large_data, f)
            temp_file_path = f.name
        
        try:
            with open(temp_file_path, 'rb') as f:
                response = client.post(
                    "/api/imports/capabilities/1/domains",
                    files={"file": ("large_test.json", f, "application/json")}
                )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["data"]["total_domains"] == 100
            assert data["data"]["total_attributes"] == 1000
        finally:
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path) 