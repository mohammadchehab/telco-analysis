#!/usr/bin/env python3
"""
Script to run the vendor_scores migration.
This script adds the missing vendor_id column to the vendor_scores table.
"""

import sys
import os

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from migration.migrate_vendor_scores import main

if __name__ == "__main__":
    print("🚀 Starting vendor_scores migration...")
    main()
    print("✅ Migration completed!") 