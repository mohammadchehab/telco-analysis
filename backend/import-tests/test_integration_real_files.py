#!/usr/bin/env python3
"""
Real Integration Test - Tests the actual API with real JSON files from import-tests/files directory
This test loads all JSON files and tests the import functionality end-to-end.
"""

import os
import json
import requests
from pathlib import Path
from typing import List, Dict, Any
import time

# Configuration
API_BASE_URL = "http://127.0.0.1:8000"  # Adjust if your API runs on different port
IMPORT_DIR = Path(__file__).parent / "files"
TEST_CAPABILITY_ID = 8  # You may need to create this capability first

class RealIntegrationTest:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        
    def setup_auth(self):
        """Setup authentication - you may need to adjust this based on your auth setup"""
        try:
            # Login with admin credentials
            login_data = {
                "username": "admin",
                "password": "admin123"
            }
            
            login_url = f"{API_BASE_URL}/api/auth/login"
            response = self.session.post(login_url, json=login_data)
            
            if response.status_code == 200:
                login_response = response.json()
                if login_response.get('success') and login_response.get('data', {}).get('access_token'):
                    token = login_response['data']['access_token']
                    self.session.headers.update({
                        'Authorization': f'Bearer {token}'
                    })
                    print("✅ Authentication successful")
                    return True
                else:
                    print(f"❌ Login failed: {login_response.get('error', 'Unknown error')}")
                    return False
            else:
                print(f"❌ Login request failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Authentication setup failed: {e}")
            return False
    
    def load_json_files(self) -> List[Dict[str, Any]]:
        """Load all JSON files from the import directory"""
        files = []
        if not IMPORT_DIR.exists():
            print(f"ERROR: Import directory {IMPORT_DIR} does not exist!")
            return files
            
        for json_file in IMPORT_DIR.glob("*.json"):
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
    
    def test_file_format_detection(self, file_info: Dict[str, Any]) -> Dict[str, Any]:
        """Test file format detection for each file"""
        import sys
        import os
        
        # Add the backend directory to the path
        backend_dir = Path(__file__).parent.parent
        sys.path.insert(0, str(backend_dir))
        
        try:
            from services.import_service import ImportService
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
    
    def test_api_import(self, file_info: Dict[str, Any]) -> Dict[str, Any]:
        """Test actual API import for each file"""
        try:
            # Prepare the file for upload
            with open(file_info['path'], 'rb') as f:
                files = {'file': (file_info['filename'], f, 'application/json')}
                
                # Make the API call
                url = f"{API_BASE_URL}/api/imports/capabilities/{TEST_CAPABILITY_ID}/domains"
                response = self.session.post(url, files=files)
                
                result = {
                    'filename': file_info['filename'],
                    'status_code': response.status_code,
                    'success': response.status_code == 200,
                    'response_data': None,
                    'error': None
                }
                
                if response.status_code == 200:
                    try:
                        result['response_data'] = response.json()
                    except:
                        result['response_data'] = response.text
                else:
                    result['error'] = response.text
                    
                return result
                
        except Exception as e:
            return {
                'filename': file_info['filename'],
                'status_code': 0,
                'success': False,
                'error': str(e),
                'response_data': None
            }
    
    def test_current_framework_specific(self, file_info: Dict[str, Any]) -> Dict[str, Any]:
        """Specific test for current_framework functionality"""
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
                else:
                    # Simple domain names
                    domain_names = [str(d) for d in domains]
            else:
                domain_names = []
            
            return {
                'filename': file_info['filename'],
                'test_type': 'current_framework',
                'domains_found': len(domain_names),
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
    
    def run_all_tests(self):
        """Run all tests on all files"""
        print("=== REAL INTEGRATION TEST STARTING ===")
        print(f"Loading files from: {IMPORT_DIR.absolute()}")
        
        # Load all JSON files
        files = self.load_json_files()
        if not files:
            print("ERROR: No files loaded!")
            return
        
        print(f"\nLoaded {len(files)} files for testing")
        
        # Setup auth if needed
        print("\nSetting up authentication...")
        auth_success = self.setup_auth()
        if not auth_success:
            print("⚠️  Authentication failed - API tests will be skipped")
        
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
            
            # Test 4: API import (only if API is available and authenticated)
            if auth_success:
                try:
                    api_result = self.test_api_import(file_info)
                    print(f"API import: {'SUCCESS' if api_result['success'] else 'FAILED'}")
                    if not api_result['success']:
                        print(f"  Error: {api_result.get('error', 'Unknown error')}")
                except Exception as e:
                    print(f"API import: SKIPPED (API error: {e})")
                    api_result = {'success': False, 'error': f'API error: {e}'}
            else:
                print("API import: SKIPPED (Authentication failed)")
                api_result = {'success': False, 'error': 'Authentication failed'}
            
            # Store results
            self.test_results.append({
                'filename': file_info['filename'],
                'format_detection': format_result,
                'current_framework': current_framework_result,
                'vendor_import': vendor_result,
                'api_import': api_result
            })
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*50)
        print("TEST SUMMARY")
        print("="*50)
        
        total_files = len(self.test_results)
        successful_imports = sum(1 for r in self.test_results if r['api_import']['success'])
        current_framework_files = sum(1 for r in self.test_results if not r['current_framework'].get('skipped'))
        vendor_files = sum(1 for r in self.test_results if r['vendor_import']['vendors_found'] > 0)
        
        print(f"Total files tested: {total_files}")
        print(f"Successful API imports: {successful_imports}/{total_files}")
        print(f"Files with current_framework: {current_framework_files}")
        print(f"Files with vendors: {vendor_files}")
        
        # Detailed results
        print("\nDETAILED RESULTS:")
        for result in self.test_results:
            print(f"\n{result['filename']}:")
            print(f"  Format: {result['format_detection']['detected_format']}")
            if not result['current_framework'].get('skipped'):
                print(f"  Current framework domains: {result['current_framework'].get('domains_found', 0)}")
            print(f"  Vendors: {result['vendor_import'].get('vendors_found', 0)}")
            print(f"  API import: {'✓' if result['api_import']['success'] else '✗'}")
            if not result['api_import']['success']:
                print(f"    Error: {result['api_import'].get('error', 'Unknown')}")

def main():
    """Main function to run the integration test"""
    test = RealIntegrationTest()
    test.run_all_tests()

if __name__ == "__main__":
    main() 