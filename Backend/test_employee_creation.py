#!/usr/bin/env python3
"""
Test script to verify employee creation is working correctly
"""

import asyncio
import json
from services.mcpServices.LLMs.Groq.GroqSerivce import GroqService
from services.mcpServices.LLMs.Groq.ToolService import ToolService

async def test_employee_creation():
    print("🧪 Testing Employee Creation via MCP...")
    
    # Test 1: Test Groq service with employee creation prompt
    groq_service = GroqService()
    
    test_prompt = "Add a plant admin with email jane@ex.com, name Jane, password secret, for plant_id 1656d76f-dca9-4a50-b4ed-5f96ee38342e"
    
    print(f"\n1️⃣ Testing Groq Service with prompt: '{test_prompt}'")
    
    messages = [{"content": test_prompt}]
    groq_response = await groq_service.query(messages)
    
    print(f"✅ Groq Response: {json.dumps(groq_response, indent=2)}")
    
    # Test 2: Test ToolService with the response
    if groq_response.get("isDbRelated") and "response" in groq_response:
        print(f"\n2️⃣ Testing ToolService with Groq response...")
        
        tool_service = ToolService()
        tool_response = tool_service.db_call(groq_response["response"], test_prompt)
        
        print(f"✅ Tool Response: {json.dumps(tool_response, indent=2)}")
        
        if isinstance(tool_response, dict) and tool_response.get("success"):
            print(f"🎉 SUCCESS: Employee creation completed!")
            print(f"   - User ID: {tool_response.get('user_id')}")
            print(f"   - Email: {tool_response.get('email')}")
            print(f"   - Role: {tool_response.get('role')}")
        else:
            print(f"❌ FAILED: {tool_response}")
    else:
        print(f"❌ FAILED: Groq response is not DB-related or missing response field")

if __name__ == "__main__":
    asyncio.run(test_employee_creation())
