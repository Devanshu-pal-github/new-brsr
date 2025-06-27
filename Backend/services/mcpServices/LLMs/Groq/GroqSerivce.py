import json
import os
import httpx

from services.mcpServices.LLMs.Groq.Context import GroqContext
from services.mcpServices.LLMs.Groq.LoggerService import get_logger

logger = get_logger("MCP.GroqService")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "your-groq-api-key-here")  # Replace with your actual Groq API key
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"

class GroqService:
    def __init__(self):
        self.api_key = GROQ_API_KEY
        self.url = GROQ_URL
        self.model = GROQ_MODEL

    @staticmethod
    def get_context():
        return GroqContext

    async def query(self, messages):
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        user_input = messages[0].get("content", "") if messages else ""
        combined_context = f"{self.get_context()}\n\nUser Input: {user_input}"
        payload = {
            "model": GROQ_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": combined_context
                }
            ]
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(self.url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                logger.info("Groq API raw response: %s", data)
                if "choices" in data and data["choices"]:
                    content = data["choices"][0]["message"].get("content", "")
                    logger.info("Groq API content: %s", content)
                    try:
                        return json.loads(content)
                    except Exception as e:
                        logger.error("Failed to parse Groq content as JSON: %s", e)
                        return {"response": f"Groq returned non-JSON content: {content}"}
                else:
                    logger.error("Groq API response missing 'choices': %s", data)
                    return {"response": f"Groq API error: {data}"}
        except Exception as e:
            logger.error("Groq API error: %s", e)
            return {"response": f"Error querying Groq API: {str(e)}"}

def get_groq_service():
    return GroqService()
