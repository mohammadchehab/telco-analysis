#!/usr/bin/env python3
"""
Run Real Integration Test Script
This script runs the comprehensive integration test with real JSON files.
"""

import os
import sys
import subprocess
import time
import requests
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

def check_api_availability():
    """Check if the API is running and accessible"""
    try:
        response = requests.get("http://localhost:8000/docs", timeout=5)
        if response.status_code == 200:
            print("✓ API is running and accessible")
            return True
    except requests.exceptions.RequestException:
        pass
    
    print("✗ API is not running or not accessible")
    print("  Please start the API server first:")
    print("  cd backend && python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000")
    return False

def create_test_capability():
    """Create a test capability if it doesn't exist"""
    try:
        from models.models import Capability
        from core.database import SessionLocal
        
        db = SessionLocal()
        
        # Check if test capability exists
        test_capability = db.query(Capability).filter(Capability.name == "Test Capability").first()
        
        if not test_capability:
            # Create test capability
            test_capability = Capability(
                name="Test Capability",
                description="Test capability for integration testing",
                status="new"
            )
            db.add(test_capability)
            db.commit()
            db.refresh(test_capability)
            print(f"✓ Created test capability with ID: {test_capability.id}")
        else:
            print(f"✓ Test capability already exists with ID: {test_capability.id}")
        
        db.close()
        return test_capability.id
        
    except Exception as e:
        print(f"✗ Error creating test capability: {e}")
        return 1

def run_integration_test():
    """Run the integration test"""
    print("=== REAL INTEGRATION TEST ===")
    print()
    
    # Check if we're in the right directory
    files_dir = Path(__file__).parent / "files"
    if not files_dir.exists():
        print("✗ files directory not found!")
        print("  Please ensure the files directory exists in import-tests")
        return False
    
    # Check API availability
    if not check_api_availability():
        return False
    
    # Create test capability
    capability_id = create_test_capability()
    if capability_id is None:
        return False
    
    # Update the test capability ID in the integration test
    integration_test_file = Path(__file__).parent / "test_integration_real_files.py"
    if integration_test_file.exists():
        with open(integration_test_file, 'r') as f:
            content = f.read()
        
        # Update the capability ID
        content = content.replace("TEST_CAPABILITY_ID = 1", f"TEST_CAPABILITY_ID = {capability_id}")
        
        with open(integration_test_file, 'w') as f:
            f.write(content)
        
        print(f"✓ Updated test capability ID to {capability_id}")
    
    # Run the integration test
    print("\nRunning integration test...")
    try:
        from test_integration_real_files import RealIntegrationTest
        
        test = RealIntegrationTest()
        test.run_all_tests()
        
        print("\n=== INTEGRATION TEST COMPLETED ===")
        return True
        
    except Exception as e:
        print(f"✗ Error running integration test: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main function"""
    print("Real Integration Test Runner")
    print("=" * 40)
    
    # Check if we're in the right directory
    if not Path("backend").exists():
        print("✗ backend directory not found!")
        print("  Please run this script from the project root directory")
        sys.exit(1)
    
    # Run the test
    success = run_integration_test()
    
    if success:
        print("\n✓ Integration test completed successfully!")
        sys.exit(0)
    else:
        print("\n✗ Integration test failed!")
        sys.exit(1)

if __name__ == "__main__":
    main() 