# Comprehensive Research Prompt

## Capability: Data Analytics and Machine Learning

### Current Framework
**Domains**: 10
**Attributes**: 27

### Existing Domain Structure
**Data Management & Integration** (4 attributes)
  - Data Integration / Ingestion
  - Data Quality Management
  - Master Data Management (MDM)
  - Metadata Management

**Data Engineering** (4 attributes)
  - Batch & Streaming Processing
  - Data Transformation & Enrichment
  - DataOps
  - Orchestration & Workflow Automation

**Generative AI Enablement** (0 attributes)

**Data Management & Integration** (4 attributes)
  - Data Integration / Ingestion
  - Data Quality Management
  - Master Data Management (MDM)
  - Metadata Management

**Data Engineering** (4 attributes)
  - Batch & Streaming Processing
  - Data Transformation & Enrichment
  - DataOps
  - Orchestration & Workflow Automation

**Data Governance & Security** (3 attributes)
  - Access Control & Authentication
  - Data Lineage & Audit
  - Data Privacy & Compliance

**Machine Learning & Data Science** (5 attributes)
  - Experiment Tracking
  - Feature Store Management
  - Hyperparameter Optimization
  - Model Explainability
  - Model Training & Validation

**Visualization & Business Intelligence** (4 attributes)
  - Ad-hoc Query Building
  - Dashboard Creation & Sharing
  - Report Scheduling & Distribution
  - Self-Service Data Exploration

**MLOps & Model Lifecycle Management** (4 attributes)
  - Automated Deployment & CI/CD for Models
  - Model Performance Monitoring
  - Model Versioning & Registry
  - Retraining & Continuous Learning

**Data Catalog & Discovery** (3 attributes)
  - Data Asset Cataloging
  - Data Lineage Visualization
  - Metadata Search & Tagging


### Research Objective
Conduct comprehensive vendor research for the telecom capability **Data Analytics and Machine Learning** to evaluate vendor capabilities and provide detailed scoring based on the existing domain and attribute framework.

### Research Requirements

1. **Vendor Analysis**
   - Research primary vendors: **Comarch**, **Servicenow**, **Salesforce**, **Databricks**, **Snowflake**, **Microsoft azure**, **Aws**, **Google cloud**, **Collibra**, **Tableau**, **Power bi**
   - Evaluate each vendor's capabilities against the existing domains and attributes
   - Assess strengths and weaknesses for each domain

2. **Attribute Scoring**
   - Score each vendor on each existing attribute (1-5 scale)
   - Provide detailed observations and evidence for each attribute
   - Consider how well each vendor supports the existing domain structure

3. **Weight Analysis**
   - Assign importance weights to existing attributes (1-100 scale)
   - Justify weight assignments based on business impact and domain importance

4. **Evidence Collection**
   - Provide specific evidence URLs for each score
   - Include detailed observations as arrays for each vendor per attribute
   - Each observation should have a type (strength, weakness, gap, feature, limitation, advantage, disadvantage, note)

### Expected Output Format

Please provide your research in the following JSON format:

```json
{
  "capability": "Data Analytics and Machine Learning",
  "research_date": "YYYY-MM-DD",
  "current_framework": {
    "domains_count": 0,
    "attributes_count": 0,
    "domains": []
  },
  "market_analysis": {
    "primary_vendors": [],
    "missing_capabilities": [
      {
        "capability_name": "string",
        "description": "string"
      }
    ]
  },
  "attributes": [
    {
      "attribute": "string",
      "domain": "string",
      "weight": 50,
      "tm_capability": "string",
            "comarch": {
        "score": "X - Level",
        "observations": [
          {
            "observation": "Detailed observation point 1",
            "type": "STRENGTH|WEAKNESS|GAP|FEATURE|LIMITATION|ADVANTAGE|DISADVANTAGE|NOTE"
          },
          {
            "observation": "Detailed observation point 2", 
            "type": "STRENGTH|WEAKNESS|GAP|FEATURE|LIMITATION|ADVANTAGE|DISADVANTAGE|NOTE"
          }
        ],
        "evidence": ["url1", "url2", "url3", "url4"],
        "score_decision": "string"
      },
      "servicenow": {
        "score": "X - Level",
        "observations": [
          {
            "observation": "Detailed observation point 1",
            "type": "STRENGTH|WEAKNESS|GAP|FEATURE|LIMITATION|ADVANTAGE|DISADVANTAGE|NOTE"
          },
          {
            "observation": "Detailed observation point 2", 
            "type": "STRENGTH|WEAKNESS|GAP|FEATURE|LIMITATION|ADVANTAGE|DISADVANTAGE|NOTE"
          }
        ],
        "evidence": ["url1", "url2", "url3", "url4"],
        "score_decision": "string"
      },
      "salesforce": {
        "score": "X - Level",
        "observations": [
          {
            "observation": "Detailed observation point 1",
            "type": "STRENGTH|WEAKNESS|GAP|FEATURE|LIMITATION|ADVANTAGE|DISADVANTAGE|NOTE"
          },
          {
            "observation": "Detailed observation point 2", 
            "type": "STRENGTH|WEAKNESS|GAP|FEATURE|LIMITATION|ADVANTAGE|DISADVANTAGE|NOTE"
          }
        ],
        "evidence": ["url1", "url2", "url3", "url4"],
        "score_decision": "string"
      },
      "Databricks": {
        "score": "X - Level",
        "observations": [
          {
            "observation": "Detailed observation point 1",
            "type": "STRENGTH|WEAKNESS|GAP|FEATURE|LIMITATION|ADVANTAGE|DISADVANTAGE|NOTE"
          },
          {
            "observation": "Detailed observation point 2", 
            "type": "STRENGTH|WEAKNESS|GAP|FEATURE|LIMITATION|ADVANTAGE|DISADVANTAGE|NOTE"
          }
        ],
        "evidence": ["url1", "url2", "url3", "url4"],
        "score_decision": "string"
      },
      "Snowflake": {
        "score": "X - Level",
        "observations": [
          {
            "observation": "Detailed observation point 1",
            "type": "STRENGTH|WEAKNESS|GAP|FEATURE|LIMITATION|ADVANTAGE|DISADVANTAGE|NOTE"
          },
          {
            "observation": "Detailed observation point 2", 
            "type": "STRENGTH|WEAKNESS|GAP|FEATURE|LIMITATION|ADVANTAGE|DISADVANTAGE|NOTE"
          }
        ],
        "evidence": ["url1", "url2", "url3", "url4"],
        "score_decision": "string"
      },
      "Microsoft Azure": {
        "score": "X - Level",
        "observations": [
          {
            "observation": "Detailed observation point 1",
            "type": "STRENGTH|WEAKNESS|GAP|FEATURE|LIMITATION|ADVANTAGE|DISADVANTAGE|NOTE"
          },
          {
            "observation": "Detailed observation point 2", 
            "type": "STRENGTH|WEAKNESS|GAP|FEATURE|LIMITATION|ADVANTAGE|DISADVANTAGE|NOTE"
          }
        ],
        "evidence": ["url1", "url2", "url3", "url4"],
        "score_decision": "string"
      },
      "AWS": {
        "score": "X - Level",
        "observations": [
          {
            "observation": "Detailed observation point 1",
            "type": "STRENGTH|WEAKNESS|GAP|FEATURE|LIMITATION|ADVANTAGE|DISADVANTAGE|NOTE"
          },
          {
            "observation": "Detailed observation point 2", 
            "type": "STRENGTH|WEAKNESS|GAP|FEATURE|LIMITATION|ADVANTAGE|DISADVANTAGE|NOTE"
          }
        ],
        "evidence": ["url1", "url2", "url3", "url4"],
        "score_decision": "string"
      },
      "Google Cloud": {
        "score": "X - Level",
        "observations": [
          {
            "observation": "Detailed observation point 1",
            "type": "STRENGTH|WEAKNESS|GAP|FEATURE|LIMITATION|ADVANTAGE|DISADVANTAGE|NOTE"
          },
          {
            "observation": "Detailed observation point 2", 
            "type": "STRENGTH|WEAKNESS|GAP|FEATURE|LIMITATION|ADVANTAGE|DISADVANTAGE|NOTE"
          }
        ],
        "evidence": ["url1", "url2", "url3", "url4"],
        "score_decision": "string"
      },
      "Collibra": {
        "score": "X - Level",
        "observations": [
          {
            "observation": "Detailed observation point 1",
            "type": "STRENGTH|WEAKNESS|GAP|FEATURE|LIMITATION|ADVANTAGE|DISADVANTAGE|NOTE"
          },
          {
            "observation": "Detailed observation point 2", 
            "type": "STRENGTH|WEAKNESS|GAP|FEATURE|LIMITATION|ADVANTAGE|DISADVANTAGE|NOTE"
          }
        ],
        "evidence": ["url1", "url2", "url3", "url4"],
        "score_decision": "string"
      },
      "Tableau": {
        "score": "X - Level",
        "observations": [
          {
            "observation": "Detailed observation point 1",
            "type": "STRENGTH|WEAKNESS|GAP|FEATURE|LIMITATION|ADVANTAGE|DISADVANTAGE|NOTE"
          },
          {
            "observation": "Detailed observation point 2", 
            "type": "STRENGTH|WEAKNESS|GAP|FEATURE|LIMITATION|ADVANTAGE|DISADVANTAGE|NOTE"
          }
        ],
        "evidence": ["url1", "url2", "url3", "url4"],
        "score_decision": "string"
      },
      "Power BI": {
        "score": "X - Level",
        "observations": [
          {
            "observation": "Detailed observation point 1",
            "type": "STRENGTH|WEAKNESS|GAP|FEATURE|LIMITATION|ADVANTAGE|DISADVANTAGE|NOTE"
          },
          {
            "observation": "Detailed observation point 2", 
            "type": "STRENGTH|WEAKNESS|GAP|FEATURE|LIMITATION|ADVANTAGE|DISADVANTAGE|NOTE"
          }
        ],
        "evidence": ["url1", "url2", "url3", "url4"],
        "score_decision": "string"
      }
    }
  ]
}
```

### Scoring Guidelines

- **Score Levels**: 1-5 scale where:
  - 1 = Poor/Not Available
  - 2 = Basic/Partial
  - 3 = Good/Adequate
  - 4 = Very Good/Strong
  - 5 = Excellent/Leading

- **Weight Guidelines**: 1-100 scale where:
  - 1-20 = Low importance
  - 21-50 = Medium importance
  - 51-80 = High importance
  - 81-100 = Critical importance

### Research Guidelines

- **Use Existing Framework**: Base your research on the current domains and attributes
- **Be objective**: Evaluate vendors fairly based on evidence
- **Be specific**: Provide detailed observations and specific evidence
- **Be current**: Use recent information and up-to-date sources
- **Be comprehensive**: Cover all existing attributes across all domains

### Observation Guidelines

- **Observation Types**: Use appropriate types for each observation:
  - `STRENGTH`: Vendor's strong capabilities or advantages
  - `WEAKNESS`: Vendor's limitations or areas of concern
  - `GAP`: Missing functionality or capabilities
  - `FEATURE`: Specific features or capabilities
  - `LIMITATION`: Technical or functional limitations
  - `ADVANTAGE`: Competitive advantages
  - `DISADVANTAGE`: Competitive disadvantages
  - `NOTE`: General observations or notes

- **Observation Quality**: Each observation should be:
  - Specific and detailed
  - Evidence-based
  - Actionable for decision-making
  - Relevant to the attribute being evaluated

### Submission Instructions

1. Review the existing domain and attribute structure
2. Complete the research following the guidelines above
3. Format your response as valid JSON
4. Ensure all required fields are populated
5. Validate the JSON structure before submission
