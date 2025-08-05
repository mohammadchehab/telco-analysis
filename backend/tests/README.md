# Test Suite for Telco-Web Backend

This directory contains comprehensive tests for the telco-web backend, specifically focusing on the import functionality and the fixes for the `current_framework` import issue.

## Test Structure

```
tests/
├── __init__.py                    # Makes tests a Python package
├── conftest.py                    # Pytest configuration and common fixtures
├── test_import_service.py         # Unit tests for ImportService
├── test_import_api.py             # Integration tests for import API endpoints
├── test_vendor_import.py          # Specific tests for vendor import functionality
├── test_current_framework_import.py # Specific tests for current_framework import issue
└── README.md                      # This file
```

## Test Coverage

### 1. ImportService Unit Tests (`test_import_service.py`)

Tests the core import functionality:

- **File Format Detection**: Tests detection of `current_framework`, `proposed_framework`, `research_file`, and `simple_domains` formats
- **Domain Import**: Tests domain creation, updating, and skipping logic
- **Attribute Import**: Tests attribute processing and deduplication
- **Vendor Import**: Tests vendor creation from market research data
- **Research Import**: Tests the complete research import process

### 2. Import API Integration Tests (`test_import_api.py`)

Tests the API endpoints:

- **File Upload**: Tests successful file uploads for all supported formats
- **Error Handling**: Tests error cases (invalid files, missing capabilities, etc.)
- **Authentication**: Tests authentication requirements
- **Large Files**: Tests handling of large JSON files
- **Vendor Creation**: Tests that vendors are created during import

### 3. Vendor Import Tests (`test_vendor_import.py`)

Specific tests for vendor import functionality:

- **New Vendors**: Tests creation of new vendors
- **Existing Vendors**: Tests handling of existing vendors
- **Mixed Scenarios**: Tests mix of existing and new vendors
- **Edge Cases**: Tests empty lists, null values, special characters

### 4. Current Framework Import Tests (`test_current_framework_import.py`)

Specific tests for the `current_framework` import issue:

- **Domain Processing**: Tests that `current_framework` domains are properly processed
- **Priority Logic**: Tests that `current_framework` takes priority over `gap_analysis`
- **Attribute Processing**: Tests that attributes are correctly extracted and processed
- **Transaction Commits**: Tests that transactions are properly committed

## Running Tests

### Prerequisites

1. Install test dependencies:
   ```bash
   cd backend
   pip install -r requirements-test.txt
   ```

2. Ensure you're in the backend directory:
   ```bash
   cd backend
   ```

### Running All Tests

```bash
# Run all tests
python run_tests.py

# Run with coverage
python run_tests.py --coverage

# Run with verbose output
python run_tests.py --verbose
```

### Running Specific Test Types

```bash
# Run only unit tests
python run_tests.py --type unit

# Run only integration tests
python run_tests.py --type integration

# Run specific test file
pytest tests/test_current_framework_import.py -v
```

### Running Individual Test Files

```bash
# Run ImportService tests
pytest tests/test_import_service.py -v

# Run API integration tests
pytest tests/test_import_api.py -v

# Run vendor import tests
pytest tests/test_vendor_import.py -v

# Run current_framework import tests
pytest tests/test_current_framework_import.py -v
```

### Running with Coverage

```bash
# Run with coverage report
pytest --cov=services --cov=api --cov-report=html --cov-report=term tests/
```

## Test Data

The tests use various sample data files:

1. **Current Framework Data**: Sample data matching the bug report structure
2. **Proposed Framework Data**: Sample data for proposed framework format
3. **Research File Data**: Sample data for research file format
4. **Simple Domains Data**: Sample data for simple domains format

## Key Test Scenarios

### 1. Current Framework Import Issue

The tests specifically verify that:

- `current_framework` domains are properly extracted and processed
- `current_framework` takes priority over `gap_analysis`
- Domains and attributes are correctly created in the database
- Transactions are properly committed

### 2. Vendor Import

The tests verify that:

- Vendors from `market_research.major_vendors` are imported
- Existing vendors are not duplicated
- New vendors are created with correct data
- Special characters and edge cases are handled

### 3. Error Handling

The tests verify that:

- Invalid file formats are rejected
- Missing capabilities return appropriate errors
- Malformed JSON is handled gracefully
- Authentication is required for protected endpoints

## Debugging Tests

### Running Tests in Debug Mode

```bash
# Run with debug output
pytest tests/ -v -s

# Run specific test with debug
pytest tests/test_current_framework_import.py::TestCurrentFrameworkImport::test_current_framework_domains_are_processed -v -s
```

### Common Issues

1. **Import Errors**: Ensure you're in the backend directory and the Python path is set correctly
2. **Mock Issues**: Check that mocks are properly configured for the test scenario
3. **Database Issues**: Tests use mocks, so no actual database is required

## Adding New Tests

When adding new tests:

1. Follow the existing naming conventions
2. Use the provided fixtures from `conftest.py`
3. Mock external dependencies appropriately
4. Add comprehensive docstrings
5. Test both success and failure scenarios

## Test Maintenance

- Run tests regularly to ensure they pass
- Update tests when the underlying code changes
- Add new tests for new features or bug fixes
- Keep test data up to date with actual data structures 