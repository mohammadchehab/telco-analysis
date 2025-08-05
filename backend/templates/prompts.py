"""
Prompt templates for the telco capability analysis system.
These templates contain the full, detailed markdown prompts used for research.
"""

# New Capability Domain Analysis Template
NEW_CAPABILITY_DOMAIN_TEMPLATE = """# **NEW** Capability Domain and Attribute Analysis Prompt

You are analyzing a **NEW** telecom capability that is not currently in our framework. You need to research and create a comprehensive domain and attribute structure for this capability.

## Analysis Target

**New Capability**: {capability_name}
**Status**: Not currently in framework - needs complete analysis

## Analysis Requirements

### Primary Analysis
1. **Domain Identification**: What are the key domains that should be included for this capability?
2. **Attribute Definition**: What specific attributes should be included in each domain?
3. **Framework Completeness**: What makes a comprehensive framework for this capability?
4. **Industry Standards**: What do TM Forum and other standards say about this capability?

### Market Research
5. **Vendor Capabilities**: Research what major vendors offer in this capability area
6. **Industry Standards**: Check TM Forum and other industry standards for this capability
7. **Competitive Analysis**: What do other telecom platforms include for this capability?

### Framework Creation
8. **Domain Structure**: Define the complete domain structure for this capability
9. **Attribute Coverage**: Define comprehensive attributes for each domain
10. **Prioritization**: Which domains and attributes are most critical?

## Required JSON Response

Return ONLY valid JSON in this exact format:

```json
{{
    "capability": "{capability_name}",
    "analysis_date": "YYYY-MM-DD",
    "capability_status": "new",
    "proposed_framework": {{
        "domains": [
            {{
                "domain_name": "Domain Name",
                "description": "Description of what this domain covers",
                "importance": "high|medium|low",
                "attributes": [
                    {{
                        "attribute_name": "Attribute Name",
                        "definition": "Detailed definition of this attribute",
                        "tm_forum_mapping": "TM Forum mapping if applicable",
                        "importance": "high|medium|low"
                    }}
                ]
            }}
        ]
    }}
}}
```
"""

# Existing Capability Domain Analysis Template
EXISTING_CAPABILITY_DOMAIN_TEMPLATE = """# Domain and Attribute Analysis Prompt

You are analyzing the domains and attributes for a telecom capability to determine if the current framework is comprehensive or if we need additional domains and attributes.

## Analysis Target

**Capability**: {capability_name}
**Current Domains**: {domain_count}
**Current Attributes**: {attribute_count}

## Current Framework

### Domains and Attributes
{domains_text}

## Analysis Requirements

### Primary Analysis
1. **Domain Coverage**: Are the current domains sufficient to cover all aspects of this capability?
2. **Attribute Completeness**: Are the current attributes comprehensive within each domain?
3. **Missing Domains**: What additional domains should be included?
4. **Missing Attributes**: What additional attributes should be added to existing or new domains?

### Market Research
5. **Vendor Capabilities**: Research what major vendors offer in this capability area
6. **Industry Standards**: Check TM Forum and other industry standards for this capability
7. **Competitive Analysis**: What do other telecom platforms include for this capability?

### Gap Analysis
8. **Identify Gaps**: What capabilities are missing from the current framework?
9. **Prioritization**: Which missing domains/attributes are most critical?
10. **Recommendations**: What should be added to make this framework complete?

## Required JSON Response

Return ONLY valid JSON in this exact format:

```json
{{
    "capability": "{capability_name}",
    "analysis_date": "YYYY-MM-DD",
    "capability_status": "new",
    "current_framework": {{
        "domains_count": {domain_count},
        "attributes_count": {attribute_count},
        "domains": {domains}
    }},
    "gap_analysis": {{
        "missing_domains": [
            {{
                "domain_name": "Missing Domain Name",
                "description": "Description of what this domain covers",
                "importance": "high|medium|low",
                "reasoning": "Why this domain is needed"
            }}
        ],
        "missing_attributes": [
            {{
                "domain": "Existing or New Domain",
                "attribute_name": "Missing Attribute Name",
                "description": "Description of what this attribute covers",
                "importance": "high|medium|low",
                "reasoning": "Why this attribute is needed"
            }}
        ]
    }},
    "market_research": {{
        "major_vendors": ["vendor1", "vendor2", "vendor3"],
        "industry_standards": ["TMFXXX", "Other Standard"],
        "competitive_analysis": "Summary of what other platforms include"
    }},
    "recommendations": {{
        "priority_domains": ["Domain1", "Domain2"],
        "priority_attributes": ["Attribute1", "Attribute2"],
        "framework_completeness": "complete|needs_minor_updates|needs_major_updates",
        "next_steps": "What should be done to complete the framework"
    }}
}}
```

## Research Instructions

### Analysis Process
1. **Review Current Framework**: Understand what domains and attributes are currently included
2. **Research Industry Standards**: Check TM Forum and other telecom standards
3. **Research Vendor Capabilities**: See what major vendors offer in this area
4. **Identify Gaps**: Compare current framework with industry capabilities
5. **Prioritize Recommendations**: Determine what's most important to add

### Quality Requirements
6. **Return ONLY JSON** - no other text or explanations
7. **Evidence-Based** - support recommendations with research
8. **Comprehensive** - consider all aspects of the capability
9. **Practical** - focus on what's actually needed and implementable

## Strict Research Instructions

### URL Validation Requirements
1. **Only use URLs that are live and accessible at the time of research.**
   - Disallow redirects like `file:///home/oai/redirect.html`
   - Disallow broken links (404, 502, blank pages)
   - Disallow third-party PDFs unless hosted on an official vendor domain

2. **Use only vendor-owned documentation:**
   - For Comarch: `https://www.comarch.com/`
   - For ServiceNow: `https://docs.servicenow.com/` or `https://developer.servicenow.com/`
   - For Salesforce: `https://developer.salesforce.com/` or `https://help.salesforce.com/`

3. **Validate every URL by opening it and confirming readable, live content.**
   - Do not cite placeholder, redirect, or dead pages
   - Ensure content is actually about the specific feature being researched

4. **Do not use outdated or archived PDFs (e.g., Stanford guides or redirect traps).**
   - Prefer current, official vendor documentation
   - Avoid third-party or academic sources unless they are official vendor partnerships

**IMPORTANT**: 
- Analyze the current framework thoroughly
- Research industry standards and vendor capabilities
- Identify specific gaps and missing elements
- Provide prioritized recommendations
- Return ONLY the JSON response, no other text or formatting
"""

# Comprehensive Research Template
COMPREHENSIVE_RESEARCH_TEMPLATE = """# Comprehensive Research Prompt

## Capability: {capability_name}

### Current Framework
**Domains**: {domain_count}
**Attributes**: {attribute_count}

### Existing Domain Structure
{domains_text}

### Research Objective
Conduct comprehensive vendor research for the telecom capability **{capability_name}** to evaluate vendor capabilities and provide detailed scoring based on the existing domain and attribute framework.

### Research Requirements

1. **Vendor Analysis**
   - Research primary vendors: **Comarch**, **ServiceNow**, **Salesforce**
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
{{
  "capability": "{capability_name}",
  "research_date": "YYYY-MM-DD",
  "current_framework": {{
    "domains_count": 0,
    "attributes_count": 0,
    "domains": []
  }},
  "market_analysis": {{
    "primary_vendors": [],
    "missing_capabilities": [
      {{
        "capability_name": "string",
        "description": "string"
      }}
    ]
  }},
  "attributes": [
    {{
      "attribute": "string",
      "domain": "string",
      "weight": 50,
      "tm_capability": "string",
      "comarch": {{
        "score": "X - Level",
        "observations": [
          {{
            "observation": "Detailed observation point 1",
            "type": "STRENGTH|WEAKNESS|GAP|FEATURE|LIMITATION|ADVANTAGE|DISADVANTAGE|NOTE"
          }},
          {{
            "observation": "Detailed observation point 2", 
            "type": "STRENGTH|WEAKNESS|GAP|FEATURE|LIMITATION|ADVANTAGE|DISADVANTAGE|NOTE"
          }}
        ],
        "evidence": ["url1", "url2", "url3", "url4"],
        "score_decision": "string"
      }},
      "servicenow": {{ ... }},
      "salesforce": {{ ... }}
    }}
  ]
}}
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
"""

def format_domains_summary(capability_data: dict) -> str:
    """Format domains and attributes into a readable summary"""
    domains = capability_data.get("domains", [])
    attributes = capability_data.get("attributes", [])
    
    domains_summary = []
    for domain in domains:
        domain_attributes = [attr for attr in attributes if attr["domain"] == domain]
        domains_summary.append(f"**{domain}** ({len(domain_attributes)} attributes)")
        for attr in domain_attributes:
            domains_summary.append(f"  - {attr['attribute_name']}")
        domains_summary.append("")
    
    return "\n".join(domains_summary)

def get_dynamic_vendor_sections(vendors: list) -> str:
    """Generate vendor sections dynamically for AI prompts"""
    vendor_sections = []
    for vendor in vendors:
        vendor_sections.append(f'''      "{vendor}": {{
        "score": "X - Level",
        "observations": [
          {{
            "observation": "Detailed observation point 1",
            "type": "STRENGTH|WEAKNESS|GAP|FEATURE|LIMITATION|ADVANTAGE|DISADVANTAGE|NOTE"
          }},
          {{
            "observation": "Detailed observation point 2", 
            "type": "STRENGTH|WEAKNESS|GAP|FEATURE|LIMITATION|ADVANTAGE|DISADVANTAGE|NOTE"
          }}
        ],
        "evidence": ["url1", "url2", "url3", "url4"],
        "score_decision": "string"
      }}''')
    return ",\n".join(vendor_sections)

def get_json_template(capability_name: str, capability_data: dict = None, vendors: list = None) -> str:
    """Generate the JSON template for comprehensive research"""
    if not vendors:
        vendors = ["comarch", "servicenow", "salesforce"]  # Default vendors
    
    vendor_sections = get_dynamic_vendor_sections(vendors)
    
    return f'''{{
  "capability": "{capability_name}",
  "research_date": "YYYY-MM-DD",
  "current_framework": {{
    "domains_count": 0,
    "attributes_count": 0,
    "domains": []
  }},
  "market_analysis": {{
    "primary_vendors": {vendors},
    "missing_capabilities": [
      {{
        "capability_name": "string",
        "description": "string"
      }}
    ]
  }},
  "attributes": [
    {{
      "attribute": "string",
      "domain": "string",
      "weight": 50,
      "tm_capability": "string",
{vendor_sections}
    }}
  ]
}}'''

def get_prompt_template(prompt_type: str, capability_name: str, capability_data: dict = None, vendors: list = None) -> str:
    """Get the appropriate prompt template based on type and capability data"""
    
    if not vendors:
        vendors = ["comarch", "servicenow", "salesforce"]  # Default vendors
    
    if prompt_type == "domain_analysis":
        if not capability_data or not capability_data.get("exists", False):
            # New capability
            return NEW_CAPABILITY_DOMAIN_TEMPLATE.format(capability_name=capability_name)
        else:
            # Existing capability
            domains_text = format_domains_summary(capability_data)
            return EXISTING_CAPABILITY_DOMAIN_TEMPLATE.format(
                capability_name=capability_name,
                domain_count=capability_data.get("domain_count", 0),
                attribute_count=capability_data.get("attribute_count", 0),
                domains_text=domains_text,
                domains=capability_data.get("domains", [])
            )
    
    elif prompt_type == "comprehensive_research":
        if capability_data and capability_data.get("exists", False):
            # Existing capability with domains
            domains_text = format_domains_summary(capability_data)
            template = COMPREHENSIVE_RESEARCH_TEMPLATE.format(
                capability_name=capability_name,
                domain_count=capability_data.get("domain_count", 0),
                attribute_count=capability_data.get("attribute_count", 0),
                domains_text=domains_text,
                domains=capability_data.get("domains", [])
            )
            # Replace hardcoded vendors with dynamic ones
            template = template.replace('**Comarch**, **ServiceNow**, **Salesforce**', ', '.join([f'**{v.capitalize()}**' for v in vendors]))
            return template
        else:
            # New capability without domains
            template = COMPREHENSIVE_RESEARCH_TEMPLATE.format(
                capability_name=capability_name,
                domain_count=0,
                attribute_count=0,
                domains_text="No existing domains found. Research should focus on identifying key domains and attributes for this capability.",
                domains=[]
            )
            # Replace hardcoded vendors with dynamic ones
            template = template.replace('**Comarch**, **ServiceNow**, **Salesforce**', ', '.join([f'**{v.capitalize()}**' for v in vendors]))
            return template
    
    else:
        raise ValueError(f"Unknown prompt type: {prompt_type}") 