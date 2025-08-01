#!/usr/bin/env python3
"""
Test script for AI-powered Data Quality Chat
This demonstrates how the system generates SQL queries using AI
"""

import os
import sys
import json
from pathlib import Path

# Add the backend directory to Python path
sys.path.append(str(Path(__file__).parent))

from core.database import get_db
from api.data_quality import process_with_ai, get_database_schema

def test_ai_chat():
    """Test the AI-powered data quality chat"""
    
    print("🤖 Testing AI-Powered Data Quality Chat")
    print("=" * 50)
    
    # Get database session
    db = next(get_db())
    
    # Test queries
    test_queries = [
        "Show me all capabilities with their status",
        "Find capabilities that have vendor scores",
        "Count how many domains each capability has",
        "Show me vendor scores for ServiceNow",
        "Find attributes without definitions",
        "Show capabilities missing vendor scores"
    ]
    
    for query in test_queries:
        print(f"\n🔍 Query: {query}")
        print("-" * 30)
        
        try:
            # Get database schema
            schema = get_database_schema(db)
            print(f"📊 Database Schema: {len(schema['tables'])} tables found")
            
            # Process with AI (if API key is configured)
            if os.getenv("OPENROUTER_API_KEY") and os.getenv("OPENROUTER_API_KEY") != "your_openrouter_api_key_here":
                print("🤖 Using AI to generate SQL...")
                # Note: This would require actual OpenRouter API key
                print("   (AI processing would happen here)")
            else:
                print("⚠️  OpenRouter API key not configured")
                print("   Set OPENROUTER_API_KEY in .env to enable AI features")
            
            # Show what the AI would do
            print("📝 AI would generate SQL like:")
            if "capabilities" in query.lower():
                print("   SELECT name, status FROM capabilities")
            elif "vendor" in query.lower():
                print("   SELECT DISTINCT vendor FROM vendor_scores")
            elif "domains" in query.lower():
                print("   SELECT capability_id, COUNT(*) as domain_count FROM domains GROUP BY capability_id")
            else:
                print("   SELECT * FROM capabilities LIMIT 10")
                
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print("\n✅ Test completed!")
    print("\nTo enable AI features:")
    print("1. Get free OpenRouter API key from https://openrouter.ai/keys")
    print("2. Add OPENROUTER_API_KEY=your_key_here to .env file")
    print("3. Restart the application")

if __name__ == "__main__":
    test_ai_chat() 