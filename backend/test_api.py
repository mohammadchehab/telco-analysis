#!/usr/bin/env python3
"""
Test the capabilities API endpoint
"""

import requests
import json

def test_capabilities_api():
    """Test the capabilities API endpoint"""
    try:
        # Test the capabilities endpoint
        url = "http://localhost:8000/api/capabilities/"
        print(f"Testing API endpoint: {url}")
        
        response = requests.get(url)
        print(f"Status code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get('success') and data.get('data'):
                capabilities = data['data'].get('capabilities', [])
                print(f"\nFound {len(capabilities)} capabilities:")
                for cap in capabilities:
                    print(f"  - {cap.get('name')} (Status: {cap.get('status')})")
            else:
                print("No capabilities found or API error")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Error testing API: {e}")

if __name__ == "__main__":
    test_capabilities_api() 