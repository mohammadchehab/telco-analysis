from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import json
import requests
import openai
from datetime import datetime
import os
from sqlalchemy import text

from core.database import get_db
from core.auth import get_current_user
from models.models import Capability, Domain, Attribute, VendorScore, URLValidation
from schemas.schemas import APIResponse

router = APIRouter(prefix="/data-quality", tags=["data-quality"])

def get_database_schema(db: Session) -> dict:
    """Dynamically read the actual database schema"""
    try:
        from sqlalchemy import inspect, MetaData
        from sqlalchemy.schema import ForeignKeyConstraint
        
        inspector = inspect(db.bind)
        metadata = MetaData()
        metadata.reflect(bind=db.bind)
        
        schema = {
            "description": "Telco Capability Analysis Database Schema (Dynamically Generated)",
            "tables": {},
            "relationships": [],
            "data_patterns": {
                "observation": "JSON array of strings (bullet points)",
                "status": "Workflow states: new, review, ready, completed",
                "vendors": "Common vendors: ServiceNow, Salesforce, Comarch, LogiAI, Oracle"
            }
        }
        
        # Get all tables
        for table_name in inspector.get_table_names():
            columns = {}
            for column in inspector.get_columns(table_name):
                columns[column['name']] = {
                    "type": str(column['type']),
                    "nullable": column['nullable'],
                    "primary_key": column.get('primary_key', False),
                    "default": column.get('default', None)
                }
            
            # Get foreign keys
            foreign_keys = []
            for fk in inspector.get_foreign_keys(table_name):
                foreign_keys.append({
                    "column": fk['constrained_columns'][0],
                    "referred_table": fk['referred_table'],
                    "referred_column": fk['referred_columns'][0]
                })
            
            schema["tables"][table_name] = {
                "description": f"Table: {table_name}",
                "columns": columns,
                "foreign_keys": foreign_keys
            }
            
            # Add relationships
            for fk in foreign_keys:
                schema["relationships"].append(
                    f"{table_name}.{fk['column']} → {fk['referred_table']}.{fk['referred_column']}"
                )
        
        return schema
        
    except Exception as e:
        # Fallback to basic schema if inspection fails
        return {
            "description": "Telco Capability Analysis Database Schema",
            "tables": {
                "capabilities": {"description": "Main capability definitions"},
                "domains": {"description": "Domain definitions within capabilities"},
                "attributes": {"description": "Attribute definitions within domains"},
                "vendor_scores": {"description": "Vendor capability scores with evidence"}
            },
            "relationships": [
                "vendor_scores.capability_id → capabilities.id",
                "domains.capability_id → capabilities.id",
                "attributes.capability_id → capabilities.id"
            ],
            "error": f"Schema inspection failed: {str(e)}"
        }

@router.get("/test")
def test_ai_connection():
    """Test AI connection and API key"""
    return {"message": "Test endpoint working", "status": "ok"}

@router.get("/test-ai", response_model=APIResponse)
async def test_ai_connection_full():
    """Test AI connection and API key"""
    try:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            return APIResponse(
                success=False,
                error="OpenRouter API key not configured"
            )
        
        # Create OpenAI client with OpenRouter configuration
        client = openai.OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1"
        )
        
        # Simple test query
        response = client.chat.completions.create(
            model="openai/gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Say 'Hello World'"}],
            max_tokens=10
        )
        
        return APIResponse(
            success=True,
            data={
                "message": "AI connection successful",
                "response": response.choices[0].message.content
            }
        )
        
    except Exception as e:
        return APIResponse(
            success=False,
            error=f"AI connection failed: {str(e)}"
        )

@router.post("/chat", response_model=APIResponse)
async def process_data_quality_query(
    query: Dict[str, str],
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> APIResponse:
    """Process data quality queries with AI assistance"""
    try:
        user_query = query.get("query", "").strip()
        if not user_query:
            return APIResponse(success=False, error="Query is required")
        
        print(f"Processing query: {user_query}")
        
        # Step 1: Understand intent
        print("Step 1: Understanding intent...")
        intent = await understand_intent(user_query)
        print(f"Intent understood: {intent}")
        
        # Step 2: Process based on intent
        print(f"Step 2: Processing with intent type: {intent['intent_type']}")
        
        # Handle general chat (non-data queries)
        if intent['intent_type'] == 'general_chat':
            return APIResponse(
                success=True,
                data={
                    "summary": intent['analysis_focus'],
                    "details": [],
                    "sql_query": None,
                    "row_count": 0,
                    "suggestions": [
                        "Check for broken URLs in evidence links",
                        "Find duplicate domain names across capabilities",
                        "Analyze vendor coverage (ServiceNow, LogiAI, etc.)",
                        "Check data completeness and missing information"
                    ]
                }
            )
        
        # Always try AI-powered SQL generation first for data queries
        try:
            print(f"Attempting AI processing for: {user_query}")
            result = await process_with_ai(user_query, db)
            print("AI processing successful!")
            return result
        except Exception as ai_error:
            print(f"AI processing failed: {ai_error}")
            # Only fallback for very specific hard-coded patterns
            if any(keyword in user_query.lower() for keyword in ["broken url", "duplicate", "vendor coverage", "completeness"]):
                print("Using hard-coded fallback for known patterns...")
                return await fallback_pattern_matching(user_query, db)
            else:
                # For unknown queries, still try to use AI with better error handling
                print("Retrying AI with simplified prompt...")
                return await process_with_ai_simple(user_query, db)
        
    except Exception as e:
        return APIResponse(success=False, error=str(e))

async def understand_intent(user_query: str) -> dict:
    """Understand the user's intent and determine the best approach"""
    try:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise Exception("OpenRouter API key not configured")
        
        client = openai.OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1"
        )
        
        intent_prompt = f"""
You are an AI assistant analyzing user intent for a data quality system.

User Query: "{user_query}"

Analyze this query and determine:
1. Is this a data quality question or something else (greeting, general chat, etc.)?
2. If it's a data quality question, what type of check is being requested?
3. What tables/fields should be queried?
4. What specific analysis should be performed?

Return ONLY a JSON object with these fields:
- intent_type: "general_chat", "url_check", "duplicate_check", "coverage_analysis", "completeness_check", "general_query"
- target_tables: list of relevant tables (empty for non-data queries)
- analysis_focus: brief description of what to analyze (or appropriate response for non-data queries)
- complexity: "simple" or "complex"

Examples:
- For "hi": {{"intent_type": "general_chat", "target_tables": [], "analysis_focus": "Hello! I can help you analyze data quality. Try asking about broken URLs, duplicate data, vendor coverage, or data completeness.", "complexity": "simple"}}
- For "how are you": {{"intent_type": "general_chat", "target_tables": [], "analysis_focus": "I'm doing well! I'm here to help you analyze data quality in your telco capability system. What would you like to check?", "complexity": "simple"}}
- For "check broken urls": {{"intent_type": "url_check", "target_tables": ["vendor_scores"], "analysis_focus": "Check for broken URLs in evidence links", "complexity": "simple"}}
- For "what's the weather": {{"intent_type": "general_chat", "target_tables": [], "analysis_focus": "I'm focused on data quality analysis for your telco capabilities. I can help you check for broken URLs, duplicate data, vendor coverage, and data completeness issues.", "complexity": "simple"}}
"""
        
        response = client.chat.completions.create(
            model="openai/gpt-3.5-turbo",
            messages=[{"role": "user", "content": intent_prompt}],
            temperature=0.1,
            max_tokens=200
        )
        
        intent_result = response.choices[0].message.content.strip()
        return json.loads(intent_result)
        
    except Exception as e:
        print(f"Intent understanding failed: {e}")
        # Fallback to simple pattern matching
        user_query_lower = user_query.lower()
        
        # General chat detection
        if any(word in user_query_lower for word in ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "how are you", "what's up"]):
            return {"intent_type": "general_chat", "target_tables": [], "analysis_focus": "Hello! I can help you analyze data quality. Try asking about broken URLs, duplicate data, vendor coverage, or data completeness.", "complexity": "simple"}
        
        # URL validation queries
        if any(word in user_query_lower for word in ["url", "link", "broken"]):
            return {"intent_type": "url_check", "target_tables": ["vendor_scores"], "analysis_focus": "Check for broken URLs", "complexity": "simple"}
        elif any(word in user_query_lower for word in ["duplicate", "duplicate"]):
            return {"intent_type": "duplicate_check", "target_tables": ["capabilities", "domains"], "analysis_focus": "Find duplicate data", "complexity": "simple"}
        elif any(word in user_query_lower for word in ["coverage", "vendor", "servicenow", "logiai"]):
            return {"intent_type": "coverage_analysis", "target_tables": ["vendor_scores", "capabilities"], "analysis_focus": "Analyze vendor coverage", "complexity": "simple"}
        else:
            # Default to general chat for unrecognized queries
            return {"intent_type": "general_chat", "target_tables": [], "analysis_focus": f"I understand you're asking about: '{user_query}'\n\nI'm focused on data quality analysis for your telco capabilities. I can help you with:\n• URL validation and broken link detection\n• Duplicate data identification\n• Vendor coverage analysis\n• Data completeness checks\n\nTry asking me something specific about data quality!", "complexity": "simple"}

async def process_with_ai(user_query: str, db: Session) -> APIResponse:
    """Use AI to generate SQL and process the query"""
    try:
        # Get database schema
        schema = get_database_schema(db)
        
        # Configure OpenRouter (you'll need to set OPENROUTER_API_KEY in environment)
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise Exception("OpenRouter API key not configured")
        
        # Create OpenAI client with OpenRouter configuration
        client = openai.OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1"
        )
        
        # Add debug logging
        print(f"Using OpenRouter API with key: {api_key[:10]}...")
        print(f"API Base: https://openrouter.ai/api/v1")
        
        # Build AI prompt
        prompt = f"""
You are a data quality analyst for a telco capability analysis system.

Database Schema:
{json.dumps(schema, indent=2)}

User Query: "{user_query}"

IMPORTANT RULES:
1. ONLY query capabilities, domains, attributes, and vendor_scores tables
2. NEVER query users, auth, or sensitive data
3. Focus ONLY on data quality analysis
4. Use only SELECT statements
5. Handle JSON fields properly (evidence_url, observation)
6. Generate ONLY ONE SQL statement - no multiple statements

Write a SINGLE SQLite SQL query to answer the user's question about data quality.
Return ONLY the SQL query, nothing else. No semicolons, no multiple statements.
"""
        
        # Generate SQL with AI using OpenRouter (Google Gemini 2.0 Flash)
        try:
            print(f"Generating SQL for query: {user_query}")
            response = client.chat.completions.create(
                model="openai/gpt-3.5-turbo",  # Using GPT-3.5-turbo on OpenRouter
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=500
            )
            print("SQL generation successful")
        except Exception as e:
            print(f"Error generating SQL: {e}")
            raise Exception(f"Failed to generate SQL: {str(e)}")
        
        sql_query = response.choices[0].message.content.strip()
        
        # Clean up the SQL query (remove markdown if present)
        if sql_query.startswith("```sql"):
            sql_query = sql_query[6:]
        if sql_query.endswith("```"):
            sql_query = sql_query[:-3]
        sql_query = sql_query.strip()
        
        print(f"Generated SQL: {sql_query}")
        
        # Validate SQL - ensure only one statement
        # Check for multiple SELECT statements (with newlines)
        if '\nSELECT' in sql_query or sql_query.count('SELECT') > 1:
            # Split by SELECT and take only the first complete statement
            parts = sql_query.split('SELECT')
            if len(parts) > 1:
                # Reconstruct the first SELECT statement
                sql_query = 'SELECT' + parts[1]
                # Remove any trailing statements or newlines
                if '\n' in sql_query:
                    sql_query = sql_query.split('\n')[0].strip()
                if ';' in sql_query:
                    sql_query = sql_query.split(';')[0].strip()
                print(f"Multiple SELECT statements detected, using first: {sql_query}")
        
        # Also check for semicolons
        if ';' in sql_query and sql_query.count(';') > 1:
            # Split and take only the first statement
            sql_query = sql_query.split(';')[0].strip()
            print(f"Multiple statements detected, using first: {sql_query}")
        
        # Safety check - prevent queries on sensitive tables
        sensitive_tables = ['users', 'auth', 'user', 'session', 'token', 'password']
        sql_lower = sql_query.lower()
        if any(table in sql_lower for table in sensitive_tables):
            raise Exception("Query blocked: Cannot access sensitive data tables")
        
        # Execute the generated SQL
        try:
            print(f"Executing SQL: {sql_query}")
            result = db.execute(text(sql_query))
            rows = result.fetchall()
            print(f"SQL execution successful, got {len(rows)} rows")
        except Exception as e:
            print(f"Error executing SQL: {e}")
            raise Exception(f"Failed to execute SQL: {str(e)}")
        
        # Format results
        if rows:
            columns = result.keys()
            formatted_results = []
            for row in rows:
                row_dict = {}
                for i, column in enumerate(columns):
                    row_dict[column] = row[i]
                formatted_results.append(row_dict)
            
            # Send results back to AI for analysis
            analysis_prompt = f"""
You are a data quality analyst for a telco capability analysis system.

Original User Question: "{user_query}"
SQL Query Executed: {sql_query}
Query Results: {json.dumps(formatted_results, indent=2)}

Provide a BRIEF, ACTIONABLE analysis:
- What specific data quality issues did you find?
- What should be fixed immediately?
- Any patterns or red flags?

Keep it short and specific. No generic advice.
"""
            
            print(f"Analyzing results with AI for: {user_query}")
            analysis_response = client.chat.completions.create(
                model="openai/gpt-3.5-turbo",
                messages=[{"role": "user", "content": analysis_prompt}],
                temperature=0.3,
                max_tokens=500
            )
            
            analysis = analysis_response.choices[0].message.content.strip()
            
            return APIResponse(
                success=True,
                data={
                    "summary": analysis,
                    "details": formatted_results,
                    "sql_query": sql_query,
                    "row_count": len(formatted_results),
                    "suggestions": [
                        "Export results",
                        "Refine query", 
                        "View detailed data"
                    ]
                }
            )
        else:
            return APIResponse(
                success=True,
                data={
                    "summary": f"No results found for: '{user_query}'",
                    "details": [],
                    "sql_query": sql_query,
                    "suggestions": ["Try a different query", "Check data availability"]
                }
            )
    except Exception as e:
        print(f"AI processing failed: {e}")
        raise Exception(f"AI processing failed: {str(e)}")

async def process_with_ai_simple(user_query: str, db: Session) -> APIResponse:
    """Simplified AI processing for better reliability"""
    try:
        # Get database schema
        schema = get_database_schema(db)
        
        # Configure OpenRouter
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise Exception("OpenRouter API key not configured")
        
        client = openai.OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1"
        )
        
        # Simplified prompt for better reliability
        prompt = f"""
You are a data quality analyst for telco capabilities.

Database Schema:
{schema}

User question: "{user_query}"

IMPORTANT: ONLY query capabilities, domains, attributes, and vendor_scores tables.
NEVER query users or sensitive data. Focus on data quality analysis only.
Generate ONLY ONE SQL statement - no multiple statements.

Write a SINGLE SQLite SQL query. Return ONLY the SQL query, nothing else.
"""
        
        print(f"Generating simple SQL for: {user_query}")
        response = client.chat.completions.create(
            model="openai/gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=300
        )
        
        sql_query = response.choices[0].message.content.strip()
        print(f"Generated SQL: {sql_query}")
        
        # Validate SQL - ensure only one statement
        # Check for multiple SELECT statements (with newlines)
        if '\nSELECT' in sql_query or sql_query.count('SELECT') > 1:
            # Split by SELECT and take only the first complete statement
            parts = sql_query.split('SELECT')
            if len(parts) > 1:
                # Reconstruct the first SELECT statement
                sql_query = 'SELECT' + parts[1]
                # Remove any trailing statements or newlines
                if '\n' in sql_query:
                    sql_query = sql_query.split('\n')[0].strip()
                if ';' in sql_query:
                    sql_query = sql_query.split(';')[0].strip()
                print(f"Multiple SELECT statements detected, using first: {sql_query}")
        
        # Also check for semicolons
        if ';' in sql_query and sql_query.count(';') > 1:
            # Split and take only the first statement
            sql_query = sql_query.split(';')[0].strip()
            print(f"Multiple statements detected, using first: {sql_query}")
        
        # Execute the SQL
        result = db.execute(text(sql_query))
        rows = result.fetchall()
        
        # Get column names
        columns = [desc[0] for desc in result.description] if result.description else []
        
        # Format results
        formatted_results = []
        for row in rows:
            formatted_results.append(dict(zip(columns, row)))
        
        # Send results back to AI for analysis
        analysis_prompt = f"""
You are a data quality analyst for a telco capability analysis system.

Original User Question: "{user_query}"
SQL Query Executed: {sql_query}
Query Results: {json.dumps(formatted_results, indent=2)}

Provide a BRIEF, ACTIONABLE analysis:
- What specific data quality issues did you find?
- What should be fixed immediately?
- Any patterns or red flags?

Keep it short and specific. No generic advice.
"""
        
        print(f"Analyzing results with AI for: {user_query}")
        analysis_response = client.chat.completions.create(
            model="openai/gpt-3.5-turbo",
            messages=[{"role": "user", "content": analysis_prompt}],
            temperature=0.3,
            max_tokens=500
        )
        
        analysis = analysis_response.choices[0].message.content.strip()
        
        return APIResponse(
            success=True,
            data={
                "summary": analysis,
                "details": formatted_results,
                "sql_query": sql_query,
                "row_count": len(formatted_results),
                "suggestions": [
                    "Ask for more specific details",
                    "Request data export",
                    "Analyze trends over time"
                ]
            }
        )
    except Exception as e:
        return APIResponse(
            success=False,
            error=f"AI processing failed: {str(e)}"
        )

async def fallback_pattern_matching(user_query: str, db: Session) -> APIResponse:
    """Fallback to pattern matching for common queries"""
    user_query_lower = user_query.lower()
    
    # URL validation queries
    if "broken url" in user_query_lower or "evidence link" in user_query_lower or "url" in user_query_lower:
        return await check_broken_urls(db)
    
    # Duplicate detection queries
    if "duplicate" in user_query_lower:
        return await find_duplicates(db)
    
    # Vendor coverage queries
    if any(vendor in user_query_lower for vendor in ["servicenow", "logiai", "salesforce", "comarch", "oracle", "vendor"]):
        return await analyze_vendor_coverage(db)
    
    # Data completeness queries
    if "missing" in user_query_lower or "incomplete" in user_query_lower or "completeness" in user_query_lower:
        return await check_data_completeness(db)
    
    # Generic response for unrecognized queries
    return APIResponse(
        success=True,
        data={
            "summary": f"I understand you're asking about: '{user_query}'\n\nI can help you with:\n• URL validation and broken link detection\n• Duplicate data identification\n• Vendor coverage analysis\n• Data completeness checks\n• Inconsistent data detection\n\nTry asking me something more specific about data quality!",
            "suggestions": [
                "Check for broken URLs in evidence links",
                "Find duplicate domain names across capabilities",
                "Analyze vendor coverage (ServiceNow, LogiAI, etc.)",
                "Check data completeness and missing information"
            ]
        }
    )

async def check_broken_urls(db: Session) -> APIResponse:
    """Check for broken URLs in URLValidation records"""
    try:
        # Get all URLValidation records
        url_validations = db.query(URLValidation).filter(
            URLValidation.status.in_(['pending', 'flagged'])
        ).all()
        
        all_urls = []
        broken_urls = []
        
        for validation in url_validations:
            all_urls.append({
                "url": validation.url,
                "validation_id": validation.id,
                "vendor_score_id": validation.vendor_score_id,
                "status": validation.status
            })
        
        # Test URLs (simplified - in production, use async requests)
        for url_data in all_urls[:10]:  # Limit for demo
            try:
                response = requests.get(url_data["url"], timeout=5)
                if response.status_code == 404:
                    broken_urls.append(url_data)
            except:
                broken_urls.append(url_data)
        
        # Get capability names for broken URLs
        broken_urls_with_names = []
        for url_data in broken_urls:
            # Get vendor score to find capability
            vendor_score = db.query(VendorScore).filter(VendorScore.id == url_data["vendor_score_id"]).first()
            if vendor_score:
                capability = db.query(Capability).filter(Capability.id == vendor_score.capability_id).first()
                broken_urls_with_names.append({
                    "capability": capability.name if capability else "Unknown",
                    "vendor": vendor_score.vendor,
                    "url": url_data["url"],
                    "status": "404 or Error"
                })
        
        return APIResponse(
            success=True,
            data={
                "summary": f"🔍 **URL Health Check Complete**\n\nFound **{len(broken_urls)} broken URLs** out of {len(all_urls)} evidence links checked.\n\n**Broken URLs Found:**\n" + 
                         "\n".join([f"• {item['capability']} > {item['vendor']} ({item['status']})" 
                                   for item in broken_urls_with_names[:5]]),
                "details": broken_urls_with_names,
                "suggestions": ["Export broken URLs list", "Check for URL redirects", "Update evidence links"]
            }
        )
        
    except Exception as e:
        return APIResponse(success=False, error=f"Error checking URLs: {str(e)}")

async def find_duplicates(db: Session) -> APIResponse:
    """Find duplicate domain names across capabilities"""
    try:
        # Find duplicate domain names
        from sqlalchemy import func
        
        duplicate_domains = db.query(
            Domain.domain_name,
            func.count(Domain.capability_id).label('count')
        ).group_by(Domain.domain_name).having(
            func.count(Domain.capability_id) > 1
        ).all()
        
        duplicate_details = []
        for domain_name, count in duplicate_domains:
            capabilities = db.query(Capability).join(Domain).filter(
                Domain.domain_name == domain_name
            ).all()
            
            duplicate_details.append({
                "domain": domain_name,
                "count": count,
                "capabilities": [cap.name for cap in capabilities]
            })
        
        return APIResponse(
            success=True,
            data={
                "summary": f"🔍 **Duplicate Analysis Complete**\n\nFound **{len(duplicate_domains)} duplicate domain names** across multiple capabilities:\n\n**Duplicates Found:**\n" +
                         "\n".join([f"• \"{item['domain']}\" ({item['count']} capabilities)" for item in duplicate_details]),
                "details": duplicate_details,
                "suggestions": ["Review domain naming conventions", "Consolidate similar domains", "Export duplicate report"]
            }
        )
        
    except Exception as e:
        return APIResponse(success=False, error=f"Error finding duplicates: {str(e)}")

async def analyze_vendor_coverage(db: Session) -> APIResponse:
    """Analyze vendor coverage across capabilities"""
    try:
        # Get total capabilities
        total_capabilities = db.query(Capability).count()
        
        # Get vendor coverage
        from sqlalchemy import func
        
        vendor_coverage = db.query(
            VendorScore.vendor,
            func.count(func.distinct(VendorScore.capability_id)).label('covered_capabilities')
        ).group_by(VendorScore.vendor).all()
        
        coverage_details = []
        for vendor, covered in vendor_coverage:
            percentage = (covered / total_capabilities) * 100 if total_capabilities > 0 else 0
            missing = total_capabilities - covered
            
            coverage_details.append({
                "vendor": vendor,
                "coverage": round(percentage, 1),
                "covered": covered,
                "missing": missing,
                "total": total_capabilities
            })
        
        # Sort by coverage (lowest first)
        coverage_details.sort(key=lambda x: x["coverage"])
        
        return APIResponse(
            success=True,
            data={
                "summary": f"🔍 **Vendor Coverage Analysis**\n\n**Vendor Coverage Summary:**\n" +
                         "\n".join([f"• {item['vendor']}: {item['covered']}/{item['total']} capabilities ({item['coverage']}%)" 
                                   for item in coverage_details]),
                "details": coverage_details,
                "suggestions": ["Focus on low-coverage vendors", "Prioritize missing research", "Export vendor gap report"]
            }
        )
        
    except Exception as e:
        return APIResponse(success=False, error=f"Error analyzing vendor coverage: {str(e)}")

async def check_data_completeness(db: Session) -> APIResponse:
    """Check data completeness across capabilities"""
    try:
        # Get capabilities without vendor scores
        capabilities_without_scores = db.query(Capability).outerjoin(VendorScore).filter(
            VendorScore.id.is_(None)
        ).all()
        
        # Get capabilities without domains
        capabilities_without_domains = db.query(Capability).outerjoin(Domain).filter(
            Domain.id.is_(None)
        ).all()
        
        # Get attributes without definitions
        attributes_without_definitions = db.query(Attribute).filter(
            Attribute.definition.is_(None) | (Attribute.definition == "")
        ).all()
        
        completeness_details = {
            "capabilities_without_scores": len(capabilities_without_scores),
            "capabilities_without_domains": len(capabilities_without_domains),
            "attributes_without_definitions": len(attributes_without_definitions),
            "incomplete_capabilities": [
                {"name": cap.name, "missing": "vendor scores"} 
                for cap in capabilities_without_scores[:5]
            ]
        }
        
        return APIResponse(
            success=True,
            data={
                "summary": f"🔍 **Data Completeness Analysis**\n\n**Missing Data Summary:**\n" +
                         f"• {completeness_details['capabilities_without_scores']} capabilities missing vendor scores\n" +
                         f"• {completeness_details['capabilities_without_domains']} capabilities with incomplete domain analysis\n" +
                         f"• {completeness_details['attributes_without_definitions']} attributes without definitions\n\n" +
                         "**Most Incomplete Capabilities:**\n" +
                         "\n".join([f"• {item['name']} ({item['missing']})" 
                                   for item in completeness_details['incomplete_capabilities']]),
                "details": completeness_details,
                "suggestions": ["Focus on incomplete capabilities", "Review missing definitions", "Export completeness report"]
            }
        )
        
    except Exception as e:
        return APIResponse(success=False, error=f"Error checking data completeness: {str(e)}")

 