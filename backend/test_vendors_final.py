#!/usr/bin/env python3
"""
Final test script to check the vendors API
"""
import requests
import json

def test_vendors_final():
    """Test the vendors API"""
    try:
        print("🔍 Testing vendors API...")
        
        # Test the API endpoint
        response = requests.get("http://localhost:8000/api/vendors/")
        print(f"✅ Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success: {data.get('success')}")
            
            if data.get('success'):
                vendors = data.get('data', {}).get('vendors', [])
                print(f"✅ Total vendors: {len(vendors)}")
                
                # Check for inactive vendors
                inactive_vendors = [v for v in vendors if not v.get('is_active')]
                print(f"✅ Inactive vendors: {len(inactive_vendors)}")
                
                if inactive_vendors:
                    print("\n📋 Inactive vendors:")
                    for vendor in inactive_vendors:
                        print(f"  - {vendor.get('name')} (ID: {vendor.get('id')})")
                else:
                    print("\n❌ No inactive vendors found in API response!")
                
                # Show all vendors
                print(f"\n📋 All vendors ({len(vendors)} total):")
                for vendor in vendors:
                    status = "🟢 Active" if vendor.get('is_active') else "🔴 Inactive"
                    print(f"  - {vendor.get('name')} (ID: {vendor.get('id')}, Status: {status})")
                    
            else:
                print(f"❌ API Error: {data.get('error')}")
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_vendors_final() 