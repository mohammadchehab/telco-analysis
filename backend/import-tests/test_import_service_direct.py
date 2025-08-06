#!/usr/bin/env python3
"""
Direct Import Service Test - Tests the import service directly with real JSON files
This test bypasses the API and tests the service layer directly.
"""

import os
import json
import sys
from pathlib import Path
from typing import List, Dict, Any

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Set the database path to be relative to the backend directory
os.chdir(backend_dir)

from services.import_service import ImportService
from models.models import Capability, Domain, Attribute, Vendor
from core.database import SessionLocal

class DirectImportTest:
    def __init__(self):
        self.db = SessionLocal()
        self.test_results = []
        
    def __del__(self):
        if hasattr(self, 'db'):
            self.db.close()
    
    def load_json_files(self) -> List[Dict[str, Any]]:
        """Load all JSON files from the import directory"""
        files = []
        import_dir = Path(__file__).parent / "files"
        
        if not import_dir.exists():
            print(f"ERROR: Import directory {import_dir} does not exist!")
            return files
            
        for json_file in import_dir.glob("*.json"):
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    files.append({
                        'filename': json_file.name,
                        'path': json_file,
                        'data': data,
                        'size': json_file.stat().st_size
                    })
                print(f"Loaded: {json_file.name} ({json_file.stat().st_size} bytes)")
            except Exception as e:
                print(f"ERROR loading {json_file.name}: {e}")
                
        return files
    
    def create_test_capability(self, capability_name: str) -> int:
        """Create a test capability if it doesn't exist"""
        # Check if capability exists
        capability = self.db.query(Capability).filter(Capability.name == capability_name).first()
        
        if not capability:
            # Create new capability - let it use the default status from the model
            capability = Capability(
                name=capability_name,
                description=f"Test capability for {capability_name}"
                # Status will default to "new" as defined in the model
            )
            self.db.add(capability)
            self.db.commit()
            self.db.refresh(capability)
            print(f"✓ Created capability: {capability_name} (ID: {capability.id})")
        else:
            print(f"✓ Found existing capability: {capability_name} (ID: {capability.id})")
        
        return capability.id
    
    def test_file_format_detection(self, file_info: Dict[str, Any]) -> Dict[str, Any]:
        """Test file format detection"""
        try:
            format_type = ImportService.detect_file_format(file_info['data'])
            return {
                'filename': file_info['filename'],
                'detected_format': format_type,
                'success': True
            }
        except Exception as e:
            return {
                'filename': file_info['filename'],
                'detected_format': 'error',
                'error': str(e),
                'success': False
            }
    
    def test_direct_import(self, file_info: Dict[str, Any], capability_id: int, strict_mode: bool = False) -> Dict[str, Any]:
        """Test direct import using the service"""
        try:
            # Get initial counts
            initial_domains = self.db.query(Domain).filter(Domain.capability_id == capability_id).count()
            initial_attributes = self.db.query(Attribute).filter(Attribute.capability_id == capability_id).count()
            initial_vendors = self.db.query(Vendor).count()
            
            # Perform import
            if file_info['data'].get('current_framework') or file_info['data'].get('gap_analysis'):
                # Research file format
                stats = ImportService.process_research_import(
                    self.db, capability_id, file_info['data'], file_info['filename']
                )
            else:
                # Simple domains format
                domains_data = file_info['data'].get('domains', [])
                stats = ImportService.process_domain_import(
                    self.db, capability_id, domains_data, file_info['filename']
                )
            
            # Get final counts
            final_domains = self.db.query(Domain).filter(Domain.capability_id == capability_id).count()
            final_attributes = self.db.query(Attribute).filter(Attribute.capability_id == capability_id).count()
            final_vendors = self.db.query(Vendor).count()
            
            # Check for vendor import violations in strict mode
            vendor_violations = []
            if strict_mode and 'market_research' in file_info['data']:
                expected_vendors = file_info['data']['market_research'].get('major_vendors', [])
                imported_vendors = stats.get('imported_vendors', [])
                failed_vendors = [v for v in expected_vendors if v not in imported_vendors]
                if failed_vendors:
                    vendor_violations = failed_vendors
            
            return {
                'filename': file_info['filename'],
                'success': len(vendor_violations) == 0 if strict_mode else True,
                'initial_domains': initial_domains,
                'final_domains': final_domains,
                'new_domains': final_domains - initial_domains,
                'initial_attributes': initial_attributes,
                'final_attributes': final_attributes,
                'new_attributes': final_attributes - initial_attributes,
                'initial_vendors': initial_vendors,
                'final_vendors': final_vendors,
                'new_vendors': final_vendors - initial_vendors,
                'stats': stats,
                'vendor_violations': vendor_violations if strict_mode else []
            }
            
        except Exception as e:
            self.db.rollback()
            return {
                'filename': file_info['filename'],
                'success': False,
                'error': str(e)
            }
    
    def test_current_framework_specific(self, file_info: Dict[str, Any]) -> Dict[str, Any]:
        """Test current_framework specific functionality"""
        if 'current_framework' not in file_info['data']:
            return {
                'filename': file_info['filename'],
                'test_type': 'current_framework',
                'skipped': True,
                'reason': 'No current_framework section found'
            }
        
        try:
            current_framework = file_info['data']['current_framework']
            domains = current_framework.get('domains', [])
            
            # Check if domains are in the expected format
            if isinstance(domains, list) and len(domains) > 0:
                if isinstance(domains[0], dict):
                    # Full domain objects
                    domain_names = [d.get('domain_name', '') for d in domains if isinstance(d, dict)]
                    domain_count = len(domain_names)
                else:
                    # Simple domain names
                    domain_names = [str(d) for d in domains]
                    domain_count = len(domain_names)
            else:
                domain_names = []
                domain_count = 0
            
            return {
                'filename': file_info['filename'],
                'test_type': 'current_framework',
                'domains_found': domain_count,
                'domain_names': domain_names,
                'success': True
            }
            
        except Exception as e:
            return {
                'filename': file_info['filename'],
                'test_type': 'current_framework',
                'error': str(e),
                'success': False
            }
    
    def test_vendor_import(self, file_info: Dict[str, Any]) -> Dict[str, Any]:
        """Test vendor import functionality"""
        try:
            market_research = file_info['data'].get('market_research', {})
            vendors = market_research.get('major_vendors', [])
            
            return {
                'filename': file_info['filename'],
                'test_type': 'vendor_import',
                'vendors_found': len(vendors),
                'vendor_names': vendors,
                'success': True
            }
            
        except Exception as e:
            return {
                'filename': file_info['filename'],
                'test_type': 'vendor_import',
                'error': str(e),
                'success': False
            }
    
    def run_all_tests(self, strict_mode: bool = False):
        """Run all tests on all files"""
        print("=== DIRECT IMPORT SERVICE TEST STARTING ===")
        if strict_mode:
            print("⚠️  STRICT MODE ENABLED - Tests will fail on vendor import violations")
        print(f"Loading files from: {Path(__file__).parent / 'files'}")
        
        # Load all JSON files
        files = self.load_json_files()
        if not files:
            print("ERROR: No files loaded!")
            return
        
        print(f"\nLoaded {len(files)} files for testing")
        
        # Test each file
        for file_info in files:
            print(f"\n--- Testing {file_info['filename']} ---")
            
            # Test 1: File format detection
            format_result = self.test_file_format_detection(file_info)
            print(f"Format detection: {format_result['detected_format']}")
            
            # Test 2: Current framework specific test
            current_framework_result = self.test_current_framework_specific(file_info)
            if not current_framework_result.get('skipped'):
                print(f"Current framework domains: {current_framework_result.get('domains_found', 0)}")
            
            # Test 3: Vendor import test
            vendor_result = self.test_vendor_import(file_info)
            print(f"Vendors found: {vendor_result.get('vendors_found', 0)}")
            
            # Test 4: Direct import test
            capability_name = file_info['data'].get('capability', 'Test Capability')
            capability_id = self.create_test_capability(capability_name)
            
            import_result = self.test_direct_import(file_info, capability_id, strict_mode)
            if import_result['success']:
                print(f"Import: SUCCESS")
                print(f"  New domains: {import_result['new_domains']}")
                print(f"  New attributes: {import_result['new_attributes']}")
                print(f"  New vendors: {import_result['new_vendors']}")
                if strict_mode and import_result.get('vendor_violations'):
                    print(f"  ⚠️  Vendor violations: {import_result['vendor_violations']}")
            else:
                print(f"Import: FAILED - {import_result.get('error', 'Unknown error')}")
                if strict_mode and import_result.get('vendor_violations'):
                    print(f"  ❌ Vendor violations: {import_result['vendor_violations']}")
            
            # Store results
            self.test_results.append({
                'filename': file_info['filename'],
                'format_detection': format_result,
                'current_framework': current_framework_result,
                'vendor_import': vendor_result,
                'direct_import': import_result
            })
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*50)
        print("TEST SUMMARY")
        print("="*50)
        
        total_files = len(self.test_results)
        successful_imports = sum(1 for r in self.test_results if r['direct_import']['success'])
        current_framework_files = sum(1 for r in self.test_results if not r['current_framework'].get('skipped'))
        vendor_files = sum(1 for r in self.test_results if r['vendor_import']['vendors_found'] > 0)
        
        total_new_domains = sum(r['direct_import'].get('new_domains', 0) for r in self.test_results if r['direct_import']['success'])
        total_new_attributes = sum(r['direct_import'].get('new_attributes', 0) for r in self.test_results if r['direct_import']['success'])
        total_new_vendors = sum(r['direct_import'].get('new_vendors', 0) for r in self.test_results if r['direct_import']['success'])
        
        print(f"Total files tested: {total_files}")
        print(f"Successful imports: {successful_imports}/{total_files}")
        print(f"Files with current_framework: {current_framework_files}")
        print(f"Files with vendors: {vendor_files}")
        print(f"Total new domains created: {total_new_domains}")
        print(f"Total new attributes created: {total_new_attributes}")
        print(f"Total new vendors created: {total_new_vendors}")
        
        # Detailed results
        print("\nDETAILED RESULTS:")
        for result in self.test_results:
            print(f"\n{result['filename']}:")
            print(f"  Format: {result['format_detection']['detected_format']}")
            if not result['current_framework'].get('skipped'):
                print(f"  Current framework domains: {result['current_framework'].get('domains_found', 0)}")
            print(f"  Vendors: {result['vendor_import'].get('vendors_found', 0)}")
            print(f"  Import: {'✓' if result['direct_import']['success'] else '✗'}")
            if result['direct_import']['success']:
                print(f"    New domains: {result['direct_import'].get('new_domains', 0)}")
                print(f"    New attributes: {result['direct_import'].get('new_attributes', 0)}")
                print(f"    New vendors: {result['direct_import'].get('new_vendors', 0)}")
            else:
                print(f"    Error: {result['direct_import'].get('error', 'Unknown')}")

def main():
    """Main function to run the direct import test"""
    import sys
    
    # Check for strict mode argument
    strict_mode = '--strict' in sys.argv or '-s' in sys.argv
    
    test = DirectImportTest()
    test.run_all_tests(strict_mode=strict_mode)
    
    # Exit with error code if strict mode and any failures
    if strict_mode:
        failed_imports = sum(1 for r in test.test_results if not r['direct_import']['success'])
        if failed_imports > 0:
            print(f"\n❌ {failed_imports} import(s) failed in strict mode")
            sys.exit(1)
        else:
            print(f"\n✅ All imports passed in strict mode")

if __name__ == "__main__":
    main() 