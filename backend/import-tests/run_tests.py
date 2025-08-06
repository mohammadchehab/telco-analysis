#!/usr/bin/env python3
"""
Test runner script for the telco-web backend
"""

import sys
import os
import subprocess
import argparse
from pathlib import Path

def run_tests(test_type="all", coverage=False, verbose=False):
    """Run tests based on the specified type"""
    
    # Add the backend directory to Python path
    backend_dir = Path(__file__).parent.parent
    sys.path.insert(0, str(backend_dir))
    
    # Base pytest command
    cmd = ["python", "-m", "pytest"]
    
    # Add coverage if requested
    if coverage:
        cmd.extend(["--cov=services", "--cov=api", "--cov-report=html", "--cov-report=term"])
    
    # Add verbose flag if requested
    if verbose:
        cmd.append("-v")
    
    # Add test type filter
    if test_type == "unit":
        cmd.append("tests/test_import_service.py")
    elif test_type == "integration":
        cmd.append("tests/test_import_api.py")
    elif test_type == "all":
        cmd.append("tests/")
    else:
        print(f"Unknown test type: {test_type}")
        return False
    
    # Run the tests
    try:
        result = subprocess.run(cmd, cwd=backend_dir)
        return result.returncode == 0
    except Exception as e:
        print(f"Error running tests: {e}")
        return False

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="Run tests for telco-web backend")
    parser.add_argument(
        "--type", 
        choices=["all", "unit", "integration"], 
        default="all",
        help="Type of tests to run (default: all)"
    )
    parser.add_argument(
        "--coverage", 
        action="store_true",
        help="Generate coverage report"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Verbose output"
    )
    
    args = parser.parse_args()
    
    print(f"Running {args.type} tests...")
    if args.coverage:
        print("Coverage reporting enabled")
    
    success = run_tests(args.type, args.coverage, args.verbose)
    
    if success:
        print("✅ All tests passed!")
        sys.exit(0)
    else:
        print("❌ Some tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main() 