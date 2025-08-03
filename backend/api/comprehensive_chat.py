from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import json
import requests
import openai
from datetime import datetime
import os
from sqlalchemy import text
import hashlib
import re

from core.database import get_db
from core.auth import get_current_user
from models.models import Capability, Domain, Attribute, VendorScore, Upload
from schemas.schemas import APIResponse

router = APIRouter(prefix="/api/comprehensive-chat", tags=["comprehensive-chat"])

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
                "evidence_url": "JSON array of strings (URLs)",
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
                "vendor_scores": {"description": "Vendor capability scores with evidence"},
                "uploads": {"description": "Uploaded documents for RAG functionality"}
            },
            "relationships": [
                "vendor_scores.capability_id → capabilities.id",
                "domains.capability_id → capabilities.id",
                "attributes.capability_id → capabilities.id"
            ],
            "error": f"Schema inspection failed: {str(e)}"
        }

def get_architecture_context(db: Session) -> dict:
    """Get architecture-related context for the chat"""
    try:
        # Get TM Forum architecture layers
        architecture_layers = [
            {
                "id": "business",
                "name": "Business Support Systems (BSS)",
                "description": "Customer-facing systems for order management, billing, and customer care",
                "capabilities": []
            },
            {
                "id": "operations", 
                "name": "Operations Support Systems (OSS)",
                "description": "Network and service management systems",
                "capabilities": []
            },
            {
                "id": "data",
                "name": "Data & Analytics", 
                "description": "Data management, analytics, and business intelligence",
                "capabilities": []
            },
            {
                "id": "security",
                "name": "Security & Identity",
                "description": "Security management, identity, and access control", 
                "capabilities": []
            },
            {
                "id": "network",
                "name": "Network & Infrastructure",
                "description": "Network management, infrastructure, and connectivity",
                "capabilities": []
            },
            {
                "id": "storage",
                "name": "Storage & Compute",
                "description": "Data storage, computing resources, and cloud infrastructure",
                "capabilities": []
            }
        ]

        # Get completed capabilities and map them to layers
        capabilities = db.query(Capability).filter(Capability.status == "completed").all()
        
        for capability in capabilities:
            layer_id = map_capability_to_layer(capability.name)["id"]
            layer = next((l for l in architecture_layers if l["id"] == layer_id), None)
            if layer:
                layer["capabilities"].append({
                    "id": capability.id,
                    "name": capability.name,
                    "description": capability.description
                })

        return {
            "architecture_layers": architecture_layers,
            "total_capabilities": len(capabilities),
            "tm_forum_mapping": "TM Forum Telco Architecture Framework"
        }
        
    except Exception as e:
        return {
            "error": f"Failed to get architecture context: {str(e)}",
            "architecture_layers": [],
            "total_capabilities": 0
        }

def get_reports_context(db: Session) -> dict:
    """Get reports-related context for the chat"""
    try:
        # Get report statistics
        total_capabilities = db.query(Capability).count()
        completed_capabilities = db.query(Capability).filter(Capability.status == "completed").count()
        vendor_scores = db.query(VendorScore).count()
        
        # Get available report types
        report_types = [
            "vendor_comparison",
            "radar_chart", 
            "score_distribution",
            "comprehensive",
            "architecture_canvas"
        ]
        
        return {
            "report_statistics": {
                "total_capabilities": total_capabilities,
                "completed_capabilities": completed_capabilities,
                "vendor_scores": vendor_scores
            },
            "available_report_types": report_types,
            "export_formats": ["json", "excel", "pdf"]
        }
        
    except Exception as e:
        return {
            "error": f"Failed to get reports context: {str(e)}",
            "report_statistics": {},
            "available_report_types": []
        }

def get_rag_context(db: Session, query: str) -> dict:
    """Get RAG context from uploaded documents"""
    try:
        # Get all active uploads
        uploads = db.query(Upload).filter(Upload.is_active == True).all()
        
        if not uploads:
            return {"relevant_documents": [], "total_documents": 0}
        
        # Simple keyword-based relevance scoring
        relevant_docs = []
        query_terms = query.lower().split()
        
        for upload in uploads:
            if not upload.content:
                continue
                
            content_lower = upload.content.lower()
            relevance_score = 0
            
            for term in query_terms:
                if term in content_lower:
                    relevance_score += content_lower.count(term)
            
            if relevance_score > 0:
                relevant_docs.append({
                    "id": upload.id,
                    "filename": upload.original_filename,
                    "content_preview": upload.content[:500] + "..." if len(upload.content) > 500 else upload.content,
                    "relevance_score": relevance_score,
                    "uploaded_at": upload.uploaded_at.isoformat(),
                    "tags": json.loads(upload.tags) if upload.tags else []
                })
        
        # Sort by relevance score
        relevant_docs.sort(key=lambda x: x["relevance_score"], reverse=True)
        
        return {
            "relevant_documents": relevant_docs[:5],  # Top 5 most relevant
            "total_documents": len(uploads)
        }
        
    except Exception as e:
        return {
            "error": f"Failed to get RAG context: {str(e)}",
            "relevant_documents": [],
            "total_documents": 0
        }

def map_capability_to_layer(capability_name: str) -> Dict[str, Any]:
    """Map capability to TM Forum architecture layer"""
    capability_lower = capability_name.lower()
    
    # Business Support Systems (BSS)
    if any(term in capability_lower for term in ["customer", "billing", "order", "product", "catalog", "care", "self-service"]):
        return {"id": "business", "name": "Business Support Systems (BSS)"}
    
    # Operations Support Systems (OSS)  
    if any(term in capability_lower for term in ["network", "service", "operations", "management", "monitoring", "provisioning"]):
        return {"id": "operations", "name": "Operations Support Systems (OSS)"}
    
    # Data & Analytics
    if any(term in capability_lower for term in ["data", "analytics", "intelligence", "reporting", "insights", "warehouse"]):
        return {"id": "data", "name": "Data & Analytics"}
    
    # Security & Identity
    if any(term in capability_lower for term in ["security", "identity", "access", "authentication", "authorization", "compliance"]):
        return {"id": "security", "name": "Security & Identity"}
    
    # Network & Infrastructure
    if any(term in capability_lower for term in ["infrastructure", "connectivity", "routing", "switching", "transport"]):
        return {"id": "network", "name": "Network & Infrastructure"}
    
    # Storage & Compute
    if any(term in capability_lower for term in ["storage", "compute", "cloud", "virtualization", "container"]):
        return {"id": "storage", "name": "Storage & Compute"}
    
    # Default to operations
    return {"id": "operations", "name": "Operations Support Systems (OSS)"}

@router.post("/chat", response_model=APIResponse)
async def process_comprehensive_query(
    query: Dict[str, str],
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> APIResponse:
    """Process comprehensive queries with AI assistance"""
    try:
        user_query = query.get("query", "").strip()
        if not user_query:
            return APIResponse(success=False, error="Query is required")
        
        print(f"Processing comprehensive query: {user_query}")
        
        # Step 1: Understand intent
        print("Step 1: Understanding intent...")
        intent = await understand_comprehensive_intent(user_query)
        print(f"Intent understood: {intent}")
        
        # Step 2: Gather context based on intent
        context = {}
        if intent['intent_type'] in ['architecture', 'architecture_analysis']:
            context['architecture'] = get_architecture_context(db)
        elif intent['intent_type'] in ['reports', 'report_generation']:
            context['reports'] = get_reports_context(db)
        elif intent['intent_type'] in ['rag', 'document_search']:
            context['rag'] = get_rag_context(db, user_query)
        else:
            # For general queries, gather all context
            context['architecture'] = get_architecture_context(db)
            context['reports'] = get_reports_context(db)
            context['rag'] = get_rag_context(db, user_query)
        
        # Step 3: Process with AI
        print(f"Step 3: Processing with AI for intent type: {intent['intent_type']}")
        result = await process_with_comprehensive_ai(user_query, intent, context, db)
        
        return result
        
    except Exception as e:
        return APIResponse(success=False, error=str(e))

async def understand_comprehensive_intent(user_query: str) -> dict:
    """Understand the user's intent for comprehensive chat"""
    try:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise Exception("OpenRouter API key not configured")
        
        client = openai.OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1"
        )
        
        intent_prompt = f"""
You are an AI assistant analyzing user intent for a comprehensive telco capability analysis system.

User Query: "{user_query}"

This system can help with:
1. Architecture analysis (TM Forum layers, capability mapping, vendor recommendations)
2. Reports generation (vendor comparisons, radar charts, score distributions)
3. Document search and RAG (searching uploaded documents)
4. Data quality analysis (URL validation, duplicates, completeness)
5. General telco capability questions

Analyze this query and determine:
1. What type of assistance is being requested?
2. What specific analysis or information is needed?
3. What context should be gathered?

Return ONLY a JSON object with these fields:
- intent_type: "architecture", "reports", "rag", "data_quality", "general_chat"
- analysis_focus: brief description of what to analyze
- context_needed: list of context types needed ["architecture", "reports", "rag"]
- complexity: "simple" or "complex"

Examples:
- For "show me the architecture canvas": {{"intent_type": "architecture", "analysis_focus": "Display TM Forum architecture layers with capability mapping", "context_needed": ["architecture"], "complexity": "simple"}}
- For "generate a vendor comparison report": {{"intent_type": "reports", "analysis_focus": "Generate vendor comparison report", "context_needed": ["reports"], "complexity": "complex"}}
- For "search documents about ServiceNow": {{"intent_type": "rag", "analysis_focus": "Search uploaded documents for ServiceNow information", "context_needed": ["rag"], "complexity": "simple"}}
- For "what's the weather": {{"intent_type": "general_chat", "analysis_focus": "I'm focused on telco capability analysis. I can help with architecture, reports, document search, and data quality.", "context_needed": [], "complexity": "simple"}}
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
        
        # Architecture queries
        if any(word in user_query_lower for word in ["architecture", "canvas", "tm forum", "layers", "bss", "oss"]):
            return {"intent_type": "architecture", "analysis_focus": "Architecture analysis", "context_needed": ["architecture"], "complexity": "simple"}
        
        # Reports queries
        elif any(word in user_query_lower for word in ["report", "export", "chart", "radar", "comparison"]):
            return {"intent_type": "reports", "analysis_focus": "Report generation", "context_needed": ["reports"], "complexity": "complex"}
        
        # RAG queries
        elif any(word in user_query_lower for word in ["search", "document", "upload", "find", "look for"]):
            return {"intent_type": "rag", "analysis_focus": "Document search", "context_needed": ["rag"], "complexity": "simple"}
        
        # Data quality queries
        elif any(word in user_query_lower for word in ["quality", "broken", "duplicate", "missing", "validate"]):
            return {"intent_type": "data_quality", "analysis_focus": "Data quality analysis", "context_needed": [], "complexity": "simple"}
        
        else:
            return {"intent_type": "general_chat", "analysis_focus": "General telco capability assistance", "context_needed": ["architecture", "reports", "rag"], "complexity": "simple"}

async def process_with_comprehensive_ai(user_query: str, intent: dict, context: dict, db: Session) -> APIResponse:
    """Use AI to process comprehensive queries"""
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
        
        # Build comprehensive prompt
        prompt = f"""
You are a comprehensive AI assistant for a telco capability analysis system.

Database Schema:
{json.dumps(schema, indent=2)}

User Query: "{user_query}"
Intent: {json.dumps(intent, indent=2)}
Context: {json.dumps(context, indent=2)}

You can help with:
1. Architecture Analysis: TM Forum layers, capability mapping, vendor recommendations
2. Reports: Generate vendor comparisons, radar charts, score distributions
3. Document Search: Search uploaded documents for relevant information
4. Data Quality: Check for issues, duplicates, missing data
5. General Questions: Answer telco capability questions

IMPORTANT RULES:
1. ONLY query capabilities, domains, attributes, vendor_scores, and uploads tables
2. NEVER query users, auth, or sensitive data
3. Use only SELECT statements for database queries
4. Handle JSON fields properly
5. Generate ONLY ONE SQL statement if needed
6. Provide actionable insights and recommendations

Based on the user's query and intent, provide a comprehensive response that includes:
- Direct answer to the question
- Relevant data analysis if applicable
- Actionable recommendations
- Suggested next steps

If the query requires database access, generate appropriate SQL and execute it.
If the query is about architecture, provide TM Forum layer analysis.
If the query is about reports, suggest appropriate report types.
If the query is about documents, use the RAG context provided.
"""
        
        # Generate response with AI
        print(f"Generating comprehensive response for: {user_query}")
        response = client.chat.completions.create(
            model="openai/gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1000
        )
        
        ai_response = response.choices[0].message.content.strip()
        
        # Check if AI wants to execute SQL
        if "SELECT" in ai_response.upper():
            # Extract and execute SQL
            sql_match = re.search(r'SELECT.*?(?:;|$)', ai_response, re.IGNORECASE | re.DOTALL)
            if sql_match:
                sql_query = sql_match.group(0).strip()
                if sql_query.endswith(';'):
                    sql_query = sql_query[:-1]
                
                # Execute SQL
                try:
                    result = db.execute(text(sql_query))
                    rows = result.fetchall()
                    
                    if rows:
                        columns = result.keys()
                        formatted_results = []
                        for row in rows:
                            row_dict = {}
                            for i, column in enumerate(columns):
                                row_dict[column] = row[i]
                            formatted_results.append(row_dict)
                        
                        return APIResponse(
                            success=True,
                            data={
                                "summary": ai_response,
                                "details": formatted_results,
                                "sql_query": sql_query,
                                "row_count": len(formatted_results),
                                "intent": intent,
                                "context": context,
                                "suggestions": [
                                    "Export results",
                                    "Generate detailed report",
                                    "Ask follow-up questions"
                                ]
                            }
                        )
                    else:
                        return APIResponse(
                            success=True,
                            data={
                                "summary": ai_response + "\n\nNo data found for the query.",
                                "sql_query": sql_query,
                                "intent": intent,
                                "context": context,
                                "suggestions": ["Try a different query", "Check data availability"]
                            }
                        )
                except Exception as sql_error:
                    return APIResponse(
                        success=True,
                        data={
                            "summary": ai_response + f"\n\nNote: Could not execute SQL query: {str(sql_error)}",
                            "intent": intent,
                            "context": context,
                            "suggestions": ["Try rephrasing your question", "Ask for specific data"]
                        }
                    )
        
        # Return AI response without SQL execution
        return APIResponse(
            success=True,
            data={
                "summary": ai_response,
                "intent": intent,
                "context": context,
                "suggestions": [
                    "Ask for specific data analysis",
                    "Request architecture insights",
                    "Generate reports",
                    "Search documents"
                ]
            }
        )
        
    except Exception as e:
        print(f"AI processing failed: {e}")
        raise Exception(f"AI processing failed: {str(e)}")

@router.get("/test-ai", response_model=APIResponse)
async def test_ai_connection():
    """Test AI connection and API key"""
    try:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            return APIResponse(
                success=False,
                error="OpenRouter API key not configured"
            )
        
        client = openai.OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1"
        )
        
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