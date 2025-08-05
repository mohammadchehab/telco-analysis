#!/usr/bin/env python3
"""
Simple script to show vendors
"""

import sys
sys.path.append('.')

from fastapi.testclient import TestClient
from app import app

def show_vendors():
    """Show all vendors"""
    client = TestClient(app)
    
    print("=== VENDORS ===")
    
    # Get all vendors
    response = client.get('/api/vendors/')
    if response.status_code == 200:
        data = response.json()
        vendors = data['data']['vendors']
        print(f"Found {len(vendors)} vendors:")
        for i, vendor in enumerate(vendors, 1):
            print(f"  {i}. {vendor['display_name']} ({vendor['name']})")
            print(f"     Description: {vendor['description'][:80]}...")
            print(f"     Website: {vendor['website_url']}")
            print(f"     Active: {vendor['is_active']}")
            print()
    
    # Get active vendor names
    print("=== ACTIVE VENDOR NAMES ===")
    response = client.get('/api/vendors/active/names')
    if response.status_code == 200:
        data = response.json()
        vendor_names = data['data']['vendors']
        print(f"Active vendor names: {', '.join(vendor_names)}")
    else:
        print(f"Error getting active vendor names: {response.status_code}")

if __name__ == "__main__":
    show_vendors() 