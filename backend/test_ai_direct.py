#!/usr/bin/env python3

import os
import openai
from dotenv import load_dotenv

# Load environment variables
load_dotenv('config.env')

# Configure OpenRouter
api_key = os.getenv("OPENROUTER_API_KEY")
client = openai.OpenAI(
    api_key=api_key,
    base_url="https://openrouter.ai/api/v1"
)

print(f"API Key: {api_key[:10]}..." if api_key else "No API key")
print(f"API Base: https://openrouter.ai/api/v1")

try:
    # Test simple query
    response = client.chat.completions.create(
        model="openai/gpt-3.5-turbo",
        messages=[{"role": "user", "content": "Say 'Hello World'"}],
        max_tokens=10
    )
    print("✅ AI Test Successful!")
    print(f"Response: {response.choices[0].message.content}")
except Exception as e:
    print(f"❌ AI Test Failed: {e}") 