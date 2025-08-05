import pytest
import json
from unittest.mock import Mock, patch
from sqlalchemy.orm import Session

from services.import_service import ImportService
from models.models import Vendor


class TestVendorImport:
    """Test cases for vendor import functionality"""

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session"""
        return Mock(spec=Session)

    def test_import_vendors_new_vendors(self, mock_db):
        """Test importing new vendors from market research"""
        # Mock database queries - no existing vendors
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        market_research = {
            "major_vendors": ["Databricks", "Snowflake", "Microsoft Azure"]
        }
        
        result = ImportService._import_vendors_from_market_research(mock_db, market_research)
        
        assert len(result) == 3
        assert "Databricks" in result
        assert "Snowflake" in result
        assert "Microsoft Azure" in result
        assert mock_db.add.call_count == 3

    def test_import_vendors_existing_vendors(self, mock_db):
        """Test importing when vendors already exist"""
        # Mock existing vendor
        mock_existing_vendor = Mock()
        mock_existing_vendor.name = "Databricks"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_existing_vendor
        
        market_research = {
            "major_vendors": ["Databricks", "Snowflake"]
        }
        
        result = ImportService._import_vendors_from_market_research(mock_db, market_research)
        
        assert len(result) == 2
        assert "Databricks" in result
        assert "Snowflake" in result
        # Only one vendor should be added (Snowflake)
        assert mock_db.add.call_count == 1

    def test_import_vendors_mixed_existing_and_new(self, mock_db):
        """Test importing mix of existing and new vendors"""
        # Mock existing vendor for first query, then None for others
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

    def test_import_vendors_empty_list(self, mock_db):
        """Test importing empty vendor list"""
        market_research = {
            "major_vendors": []
        }
        
        result = ImportService._import_vendors_from_market_research(mock_db, market_research)
        
        assert len(result) == 0
        assert mock_db.add.call_count == 0

    def test_import_vendors_no_market_research(self, mock_db):
        """Test importing when no market research data"""
        market_research = {}
        
        result = ImportService._import_vendors_from_market_research(mock_db, market_research)
        
        assert len(result) == 0
        assert mock_db.add.call_count == 0

    def test_import_vendors_none_market_research(self, mock_db):
        """Test importing when market research is None"""
        result = ImportService._import_vendors_from_market_research(mock_db, None)
        
        assert len(result) == 0
        assert mock_db.add.call_count == 0

    def test_import_vendors_with_empty_strings(self, mock_db):
        """Test importing vendors with empty strings"""
        # Mock database queries - no existing vendors
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        market_research = {
            "major_vendors": ["Databricks", "", "Snowflake", None, "Microsoft Azure"]
        }
        
        result = ImportService._import_vendors_from_market_research(mock_db, market_research)
        
        assert len(result) == 3
        assert "Databricks" in result
        assert "Snowflake" in result
        assert "Microsoft Azure" in result
        # Only 3 valid vendors should be added
        assert mock_db.add.call_count == 3

    def test_import_vendors_duplicate_names(self, mock_db):
        """Test importing vendors with duplicate names"""
        # Mock database queries - no existing vendors
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        market_research = {
            "major_vendors": ["Databricks", "Databricks", "Snowflake", "Snowflake"]
        }
        
        result = ImportService._import_vendors_from_market_research(mock_db, market_research)
        
        assert len(result) == 2  # Should only have unique vendors
        assert "Databricks" in result
        assert "Snowflake" in result
        assert mock_db.add.call_count == 2

    @patch('services.import_service.ImportService._import_vendors_from_market_research')
    def test_process_research_import_includes_vendors(self, mock_import_vendors, mock_db):
        """Test that process_research_import calls vendor import"""
        # Setup mock
        mock_import_vendors.return_value = ["Databricks", "Snowflake"]
        
        # Mock capability
        mock_capability = Mock()
        mock_capability.name = "Test Capability"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_capability
        
        research_data = {
            "capability": "Test Capability",
            "market_research": {
                "major_vendors": ["Databricks", "Snowflake"]
            }
        }
        
        result = ImportService.process_research_import(mock_db, 1, research_data)
        
        # Verify vendor import was called
        mock_import_vendors.assert_called_once_with(mock_db, research_data["market_research"])
        
        # Verify result includes vendor information
        assert "imported_vendors" in result
        assert result["imported_vendors"] == ["Databricks", "Snowflake"]
        assert "market_vendors" in result
        assert result["market_vendors"] == ["Databricks", "Snowflake"]

    def test_vendor_creation_with_correct_data(self, mock_db):
        """Test that vendors are created with correct data"""
        # Mock database queries - no existing vendors
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        market_research = {
            "major_vendors": ["Test Vendor"]
        }
        
        result = ImportService._import_vendors_from_market_research(mock_db, market_research)
        
        assert len(result) == 1
        assert "Test Vendor" in result
        
        # Verify the vendor was created with correct data
        mock_db.add.assert_called_once()
        created_vendor = mock_db.add.call_args[0][0]
        assert created_vendor.name == "Test Vendor"
        assert created_vendor.display_name == "Test Vendor"
        assert created_vendor.description == "Vendor imported from market research: Test Vendor"
        assert created_vendor.is_active is True

    def test_vendor_import_handles_special_characters(self, mock_db):
        """Test that vendor import handles special characters in names"""
        # Mock database queries - no existing vendors
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        market_research = {
            "major_vendors": ["Test-Vendor", "Test_Vendor", "Test Vendor", "Test@Vendor"]
        }
        
        result = ImportService._import_vendors_from_market_research(mock_db, market_research)
        
        assert len(result) == 4
        assert "Test-Vendor" in result
        assert "Test_Vendor" in result
        assert "Test Vendor" in result
        assert "Test@Vendor" in result
        assert mock_db.add.call_count == 4 