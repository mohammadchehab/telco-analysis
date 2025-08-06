#!/usr/bin/env python3

import json
import sys
sys.path.append('.')
from services.import_service import ImportService

# Load sample.json
with open('../sample.json', 'r') as f:
    data = json.load(f)

# Test format detection
format_type = ImportService.detect_file_format(data)
print(f'Detected format: {format_type}')
print(f'Data keys: {list(data.keys())}')
if 'current_framework' in data:
    print(f'Current framework domains: {len(data["current_framework"]["domains"])}')
else:
    print('No current_framework found') 