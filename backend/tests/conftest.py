import pytest
import tempfile
import os
import sys
from unittest.mock import Mock, patch
from sqlalchemy.orm import Session

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from models.models import Capability, Domain, Attribute, Vendor


@pytest.fixture(scope="session")
def test_db():
    """Create a test database session"""
    # This would typically create a test database
    # For now, we'll use a mock
    return Mock(spec=Session)


@pytest.fixture
def sample_capability():
    """Create a sample capability for testing"""
    capability = Mock(spec=Capability)
    capability.id = 1
    capability.name = "Test Capability"
    capability.description = "A test capability for unit testing"
    capability.status = "new"
    return capability


@pytest.fixture
def sample_domain():
    """Create a sample domain for testing"""
    domain = Mock(spec=Domain)
    domain.id = 1
    domain.capability_id = 1
    domain.domain_name = "Test Domain"
    domain.description = "A test domain for unit testing"
    domain.importance = "medium"
    domain.content_hash = "test_hash"
    domain.version = "1.0"
    domain.is_active = True
    return domain


@pytest.fixture
def sample_attribute():
    """Create a sample attribute for testing"""
    attribute = Mock(spec=Attribute)
    attribute.id = 1
    attribute.capability_id = 1
    attribute.domain_name = "Test Domain"
    attribute.attribute_name = "Test Attribute"
    attribute.definition = "A test attribute for unit testing"
    attribute.tm_forum_mapping = "TMF123"
    attribute.importance = "50"
    attribute.content_hash = "test_hash"
    attribute.version = "1.0"
    attribute.is_active = True
    return attribute


@pytest.fixture
def sample_vendor():
    """Create a sample vendor for testing"""
    vendor = Mock(spec=Vendor)
    vendor.id = 1
    vendor.name = "Test Vendor"
    vendor.display_name = "Test Vendor"
    vendor.description = "A test vendor for unit testing"
    vendor.website_url = "https://testvendor.com"
    vendor.is_active = True
    return vendor


@pytest.fixture
def temp_json_file():
    """Create a temporary JSON file for testing"""
    def _create_temp_file(data):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            import json
            json.dump(data, f)
            temp_file_path = f.name
        
        yield temp_file_path
        
        # Cleanup
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
    
    return _create_temp_file


@pytest.fixture(autouse=True)
def mock_dependencies():
    """Mock external dependencies for testing"""
    with patch('services.import_service.VersionManager.generate_domain_hash') as mock_hash, \
         patch('services.import_service.VersionManager.get_version_string') as mock_version, \
         patch('services.import_service.VersionManager.update_capability_version') as mock_update:
        
        mock_hash.return_value = "test_hash"
        mock_version.return_value = "1.0"
        mock_update.return_value = None
        
        yield {
            'hash': mock_hash,
            'version': mock_version,
            'update': mock_update
        } 