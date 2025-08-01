# Reports API Documentation

The Reports API provides comprehensive reporting and analytics functionality for telco capability analysis.

## Base URL
```
/api/reports
```

## Endpoints

### 1. Generate Report
**POST** `/generate`

Generate a comprehensive report for a capability in various formats.

**Request Body:**
```json
{
    "capability_id": 1,
    "report_type": "comprehensive", // "vendor_comparison", "radar_chart", "score_distribution", "comprehensive"
    "format": "json", // "json", "excel", "pdf"
    "include_charts": true
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "capability_name": "Network Management",
        "generated_at": "2024-01-15T10:30:00",
        "radar_chart": { ... },
        "vendor_comparison": { ... },
        "score_distribution": { ... },
        "vendor_scores": [ ... ]
    }
}
```

### 2. Get Radar Chart Data
**GET** `/{capability_id}/radar-chart`

Get radar chart data for capability comparison.

**Response:**
```json
{
    "success": true,
    "data": {
        "capability_name": "Network Management",
        "vendors": ["comarch", "servicenow", "salesforce"],
        "attributes": ["Scalability", "Performance", "Integration"],
        "scores": [[4.2, 3.8, 4.5], [3.9, 4.1, 4.0], [4.0, 4.3, 3.7]]
    }
}
```

### 3. Get Vendor Comparison Data
**GET** `/{capability_id}/vendor-comparison`

Get detailed vendor comparison data.

**Response:**
```json
{
    "success": true,
    "data": {
        "capability_name": "Network Management",
        "vendors": ["comarch", "servicenow", "salesforce"],
        "attributes": ["Scalability", "Performance", "Integration"],
        "scores": {
            "comarch": [4.2, 3.8, 4.5],
            "servicenow": [3.9, 4.1, 4.0],
            "salesforce": [4.0, 4.3, 3.7]
        },
        "weights": [50, 30, 20]
    }
}
```

### 4. Get Score Distribution Data
**GET** `/{capability_id}/score-distribution`

Get score distribution statistics.

**Response:**
```json
{
    "success": true,
    "data": {
        "capability_name": "Network Management",
        "score_ranges": ["1-2", "2-3", "3-4", "4-5"],
        "vendor_counts": {
            "comarch": [0, 1, 2, 3],
            "servicenow": [0, 0, 3, 3],
            "salesforce": [0, 1, 2, 3]
        }
    }
}
```

### 5. Get Comprehensive Report
**GET** `/{capability_id}/comprehensive`

Get all report data combined.

**Response:**
```json
{
    "success": true,
    "data": {
        "capability_name": "Network Management",
        "generated_at": "2024-01-15T10:30:00",
        "radar_chart": { ... },
        "vendor_comparison": { ... },
        "score_distribution": { ... },
        "vendor_scores": [ ... ]
    }
}
```

### 6. Get Capability Summary
**GET** `/{capability_id}/summary`

Get summary statistics for a capability.

**Response:**
```json
{
    "success": true,
    "data": {
        "capability_name": "Network Management",
        "capability_status": "completed",
        "total_attributes": 6,
        "vendors_analyzed": 3,
        "last_updated": "2024-01-15T10:30:00",
        "vendor_summaries": {
            "comarch": {
                "average_score": 4.17,
                "max_score": 5,
                "min_score": 3,
                "total_attributes": 6,
                "score_range": "3-5"
            }
        }
    }
}
```

### 7. Export Report
**GET** `/{capability_id}/export/{format}`

Export capability report in specified format.

**Parameters:**
- `capability_id`: ID of the capability
- `format`: "excel" or "pdf"
- `report_type`: "comprehensive", "vendor_comparison", "radar_chart", "score_distribution"

**Response:**
```json
{
    "success": true,
    "data": {
        "export_data": "base64_encoded_file_data",
        "filename": "Network_Management_comprehensive_report.xlsx",
        "format": "excel",
        "report_type": "comprehensive"
    }
}
```

## Report Types

### 1. Vendor Comparison
- Compares vendors across all attributes
- Shows scores, weights, and rankings
- Includes detailed vendor analysis

### 2. Radar Chart
- Multi-dimensional capability comparison
- Visual representation of vendor strengths
- Attribute-based scoring

### 3. Score Distribution
- Statistical analysis of scores
- Score range distribution
- Vendor performance patterns

### 4. Comprehensive
- Combines all report types
- Complete capability analysis
- Full vendor evaluation

## Export Formats

### Excel (.xlsx)
- Multiple worksheets
- Formatted tables
- Charts and graphs
- Professional styling

### PDF
- Professional layout
- Tables and formatting
- Print-ready format
- Consistent styling

## Usage Examples

### Generate JSON Report
```bash
curl -X POST "http://localhost:8000/api/reports/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "capability_id": 1,
    "report_type": "comprehensive",
    "format": "json"
  }'
```

### Export Excel Report
```bash
curl -X GET "http://localhost:8000/api/reports/1/export/excel?report_type=comprehensive"
```

### Get Radar Chart Data
```bash
curl -X GET "http://localhost:8000/api/reports/1/radar-chart"
```

## Error Handling

All endpoints return consistent error responses:

```json
{
    "success": false,
    "error": "Error message description"
}
```

Common error scenarios:
- Capability not found
- Invalid report type
- Invalid export format
- Database connection issues
- File generation errors 