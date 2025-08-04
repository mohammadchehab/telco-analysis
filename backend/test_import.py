#!/usr/bin/env python3

import json
import sys
import os

# Add current directory to path
sys.path.append('.')

from services.import_service import ImportService

# Load the sample data
with open('../sample.json', 'r') as f:
    data = json.load(f)

print("Testing ImportService.detect_file_format:")
print(f"Data keys: {list(data.keys())}")
print(f"Has capability: {'capability' in data}")
print(f"Has proposed_framework: {'proposed_framework' in data}")
print(f"Has domains in proposed_framework: {'domains' in data.get('proposed_framework', {})}")
print(f"Domains is list: {isinstance(data.get('proposed_framework', {}).get('domains', []), list)}")

result = ImportService.detect_file_format(data)
print(f"Detected format: {result}")
print(f"Result type: {type(result)}")
print(f"Is unknown: {result == 'unknown'}") 