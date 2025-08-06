# Import Process Documentation

## Overview

The import process handles JSON file uploads for importing domains, attributes, and vendors into the telco capability analysis system. The process supports multiple file formats and includes comprehensive error handling and deduplication.

## Current Import Process Steps

### 1. API Layer (`/api/imports/capabilities/{capability_id}/domains`)

#### Authentication & Validation
- ✅ Check if user is authenticated
- ✅ Validate capability exists
- ✅ Validate file is JSON format

#### File Processing
- ✅ Read and parse JSON file
- ✅ Detect file format (research_file, current_framework, proposed_framework, simple_domains)
- ✅ Route to appropriate import method

#### Error Handling
- ✅ Catch any exceptions and return error response

### 2. Service Layer (`process_research_import`)

#### Capability Update
- ✅ Update capability name if different
- ⚠️ Status update is commented out (intentionally)

#### Domain Extraction (Priority Order)
1. **Current Framework** (highest priority)
   - ✅ Extract domains and attributes
   - ✅ Handle both string and object formats
   - ✅ Process attributes for each domain

2. **Proposed Framework** (if no current framework)
   - ✅ Extract domains and attributes
   - ✅ Process attributes for each domain

3. **Gap Analysis** (if no current/proposed framework)
   - ✅ Extract missing domains and attributes
   - ✅ Process missing attributes for each domain

#### Vendor Import ⚠️ **PROBLEM AREA**
- ❌ Call `_import_vendors_from_market_research()`
- ❌ **Current issue**: Vendor import fails with unique constraint violation
- ❌ Error: `UNIQUE constraint failed: vendors.name`

#### Domain Processing
- ✅ Call `process_domain_import()` with extracted domains
- ✅ Handle domain deduplication and versioning
- ✅ Process attributes for each domain

#### Metadata Assembly
- ✅ Combine all stats and metadata
- ✅ Return comprehensive import results

### 3. Vendor Import (`_import_vendors_from_market_research`)

#### Current Implementation

```SQL
Import failed: (sqlite3.IntegrityError) UNIQUE constraint failed: vendors.name [SQL: INSERT INTO vendors (name, display_name, description, website_url, is_active) VALUES (?, ?, ?, ?, ?) RETURNING id, created_at, updated_at] [parameters: ('Microsoft Azure', 'Microsoft Azure', 'Vendor imported from market research: Microsoft Azure', None, 1)] (Background on this error at: https://sqlalche.me/e/20/gkpj)

```


```python
@staticmethod
def _import_vendors_from_market_research(db: Session, market_research: dict) -> List[str]:
    """Import vendors from market research data"""
    imported_vendors = []
    if not market_research or 'major_vendors' not in market_research:
        return imported_vendors
    
    for vendor_name in market_research['major_vendors']:
        if not vendor_name:
            continue
        vendor_name = vendor_name.strip()
        # Always check for existence in the main session before insert
        existing_vendor = db.query(Vendor).filter(
            func.lower(Vendor.name) == func.lower(vendor_name),
            Vendor.is_active == True
        ).first()
        if existing_vendor:
            imported_vendors.append(vendor_name)
            print(f"DEBUG: Found existing vendor: {vendor_name} -> {existing_vendor.name}")
            continue
        # Only create if not exists
        new_vendor = Vendor(
            name=vendor_name,
            display_name=vendor_name,
            description=f"Vendor imported from market research: {vendor_name}",
            is_active=True
        )
        db.add(new_vendor)
        imported_vendors.append(vendor_name)
        print(f"DEBUG: Created new vendor: {vendor_name}")
    return imported_vendors
```

#### Issues Identified
1. **Transaction Isolation**: Vendor import happens in main transaction
2. **Race Conditions**: Multiple imports can cause conflicts
3. **Error Handling**: Unique constraint violations not handled gracefully
4. **Deduplication**: No deduplication of vendor names in input

### 4. Domain Import (`process_domain_import`)

#### Domain Processing
- ✅ Generate content hash for each domain
- ✅ Check for existing domains (by hash and name)
- ✅ Handle versioning and updates
- ✅ Process attributes for each domain

#### Attribute Processing
- ✅ Generate content hash for each attribute
- ✅ Check for existing attributes (by hash and name)
- ✅ Handle versioning and updates

## Current Issues

### 1. Vendor Import Failure
**Problem**: `UNIQUE constraint failed: vendors.name` when importing vendors that already exist

**Root Cause**: 
- Vendor import happens in main transaction
- No proper deduplication of vendor names
- Race conditions between multiple imports
- Transaction state issues when errors occur

**Impact**:
- Import fails completely when vendors already exist
- No graceful handling of vendor conflicts
- Poor user experience

### 2. Transaction Management
**Problem**: Poor transaction management leads to inconsistent state

**Root Cause**:
- No explicit transaction boundaries
- Errors can leave transactions in broken state
- Rollback not handled properly

### 3. Error Handling
**Problem**: Errors are caught at API level but not handled gracefully

**Root Cause**:
- Service layer errors propagate to API
- No recovery mechanisms
- Poor error reporting

## Proposed Enhancements

### 1. Fix Vendor Import Issue

#### Enhanced Vendor Import
```python
@staticmethod
def _import_vendors_from_market_research(db: Session, market_research: dict) -> List[str]:
    """Import vendors from market research data with proper deduplication"""
    imported_vendors = []
    if not market_research or 'major_vendors' not in market_research:
        return imported_vendors
    
    # Deduplicate vendor names (case-insensitive)
    unique_vendors = []
    seen_vendors = set()
    for vendor_name in market_research['major_vendors']:
        if not vendor_name:
            continue
        vendor_name = vendor_name.strip()
        vendor_lower = vendor_name.lower()
        if vendor_lower not in seen_vendors:
            seen_vendors.add(vendor_lower)
            unique_vendors.append(vendor_name)
    
    print(f"DEBUG: Processing {len(unique_vendors)} unique vendors: {unique_vendors}")
    
    for vendor_name in unique_vendors:
        try:
            # Check if vendor already exists (case-insensitive)
            existing_vendor = db.query(Vendor).filter(
                func.lower(Vendor.name) == func.lower(vendor_name),
                Vendor.is_active == True
            ).first()
            
            if existing_vendor:
                imported_vendors.append(vendor_name)
                print(f"DEBUG: Found existing vendor: {vendor_name} -> {existing_vendor.name}")
                continue
            
            # Create new vendor
            new_vendor = Vendor(
                name=vendor_name,
                display_name=vendor_name,
                description=f"Vendor imported from market research: {vendor_name}",
                is_active=True
            )
            db.add(new_vendor)
            db.flush()  # Flush to get ID and ensure it's created
            imported_vendors.append(vendor_name)
            print(f"DEBUG: Created new vendor: {vendor_name}")
            
        except Exception as e:
            print(f"DEBUG: Error processing vendor {vendor_name}: {e}")
            # If there's a unique constraint violation, the vendor was created in another transaction
            if "UNIQUE constraint failed" in str(e) or "IntegrityError" in str(e):
                # Check if the vendor was actually created
                existing_vendor = db.query(Vendor).filter(
                    func.lower(Vendor.name) == func.lower(vendor_name),
                    Vendor.is_active == True
                ).first()
                if existing_vendor:
                    imported_vendors.append(vendor_name)
                    print(f"DEBUG: Found existing vendor after constraint violation: {vendor_name} -> {existing_vendor.name}")
                else:
                    print(f"DEBUG: Failed to import vendor {vendor_name} due to constraint violation")
            else:
                print(f"DEBUG: Unexpected error creating vendor {vendor_name}: {e}")
    
    return imported_vendors
```

### 2. Add Transaction Management

#### Enhanced Process Research Import
```python
@staticmethod
def process_research_import(db: Session, capability_id: int, research_data: dict, source_file: str = None) -> dict:
    """Process research import with proper transaction management"""
    try:
        # Start transaction
        db.begin()
        
        # ... existing code ...
        
        # Import vendors with proper error handling
        imported_vendors = []
        if 'market_research' in research_data:
            try:
                imported_vendors = ImportService._import_vendors_from_market_research(db, research_data['market_research'])
                print(f"DEBUG: Imported {len(imported_vendors)} vendors: {imported_vendors}")
            except Exception as e:
                print(f"DEBUG: Error importing vendors: {e}")
                # Rollback vendor import but continue with domains
                db.rollback()
                db.begin()  # Start new transaction
                imported_vendors = []
        
        # ... rest of the code ...
        
        # Commit transaction
        db.commit()
        return research_stats
        
    except Exception as e:
        db.rollback()
        raise
```

### 3. Add Comprehensive Logging

#### Enhanced Logging
```python
# Add detailed logging throughout the process
print(f"DEBUG: Starting import for capability {capability_id}")
print(f"DEBUG: File format detected: {file_format}")
print(f"DEBUG: Processing {len(domains_data)} domains")
print(f"DEBUG: Processing {len(market_research.get('major_vendors', []))} vendors")
```

### 4. Add Validation and Error Recovery

#### Vendor Validation
```python
def validate_vendor_name(vendor_name: str) -> bool:
    """Validate vendor name format"""
    if not vendor_name or not vendor_name.strip():
        return False
    if len(vendor_name.strip()) < 2:
        return False
    return True
```

## Testing Strategy

### 1. Unit Tests
- Test vendor import with existing vendors
- Test vendor import with new vendors
- Test vendor import with duplicate vendors in input
- Test vendor import with invalid vendor names

### 2. Integration Tests
- Test complete import process with real files
- Test import with existing vendors
- Test import with new vendors
- Test import with mixed existing/new vendors

### 3. Error Scenarios
- Test import with corrupted JSON
- Test import with missing required fields
- Test import with invalid vendor names
- Test import with database connection issues

## File Formats Supported

### 1. Research File Format
```json
{
  "capability": "Data Analytics and Machine Learning",
  "analysis_date": "2025-08-04",
  "capability_status": "existing",
  "current_framework": {
    "domains": [
      {
        "domain_name": "Data Management & Integration",
        "description": "Ensures data is collected, standardized, integrated, and made accessible across the enterprise.",
        "attributes": [
          {
            "attribute_name": "Master Data Management (MDM)",
            "description": "Provides golden records for customers, products, suppliers, and other entities.",
            "importance": "high"
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
      "AWS"
    ]
  }
}
```

### 2. Simple Domains Format
```json
{
  "domains": [
    {
      "domain_name": "Data Management",
      "description": "Data management domain",
      "attributes": [
        {
          "attribute_name": "Data Quality",
          "description": "Data quality management",
          "importance": "high"
        }
      ]
    }
  ]
}
```

## Error Codes and Messages

### Common Errors
1. `UNIQUE constraint failed: vendors.name` - Vendor already exists
2. `Capability not found` - Invalid capability ID
3. `Invalid JSON format` - Malformed JSON file
4. `Unsupported file format` - Unknown file structure

### Error Handling Strategy
1. **Graceful Degradation**: Continue import even if some components fail
2. **Detailed Logging**: Log all errors with context
3. **User Feedback**: Provide clear error messages to users
4. **Recovery Mechanisms**: Implement retry and recovery options

## Performance Considerations

### 1. Batch Processing
- Process vendors in batches
- Use bulk insert operations where possible
- Implement pagination for large imports

### 2. Database Optimization
- Use appropriate indexes
- Optimize queries for large datasets
- Implement connection pooling

### 3. Memory Management
- Stream large files
- Process data in chunks
- Clean up resources properly

## Future Enhancements

### 1. Async Processing
- Implement background job processing
- Add progress tracking
- Support for large file imports

### 2. Validation Framework
- Add comprehensive validation rules
- Implement custom validators
- Add validation reporting

### 3. Import Templates
- Create import templates
- Add template validation
- Support for template versioning

### 4. Import History
- Track import history
- Add rollback capabilities
- Implement import comparison

## Conclusion

The import process is a critical component of the telco capability analysis system. The current implementation has several issues that need to be addressed, particularly around vendor import and transaction management. The proposed enhancements will improve reliability, performance, and user experience.

The key priorities are:
1. **Fix vendor import issues** - Implement proper deduplication and error handling
2. **Improve transaction management** - Add explicit transaction boundaries
3. **Enhance error handling** - Implement graceful degradation and recovery
4. **Add comprehensive logging** - Improve debugging and monitoring capabilities 