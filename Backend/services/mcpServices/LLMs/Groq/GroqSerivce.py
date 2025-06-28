import json
import os

from groq import Groq

from services.mcpServices.LLMs.Groq.Context import GroqContext
from services.mcpServices.LLMs.Groq.LoggerService import get_logger

logger = get_logger("MCP.GroqService")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "your-groq-api-key-here")  # Replace with your actual Groq API key
# GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"


class GroqService:
    def __init__(self):
        self.api_key = GROQ_API_KEY
        self.model = GROQ_MODEL
        self.client = Groq(api_key=self.api_key)

    @staticmethod
    def get_context():
        return GroqContext

    def _strip_code_block(self, content):
        import re
        content = content.strip()
        # Remove code block markers if present
        if content.startswith('```'):
            content = re.sub(r'^```[a-zA-Z]*\n?', '', content)
            content = re.sub(r'\n?```$', '', content)
        return content.strip()


    async def query(self, messages):
        user_input = messages[0].get("content", "") if messages else ""
        # Inject a critical system warning for employee creation at the very top
        system_warning = (
            "🚨 FOR EMPLOYEE CREATION: ONLY output {\"operation\": \"create_employee\", ...}. "
            "Never use 'update', 'upsert', 'insert', 'insert_one', or 'hashed_password'. "
            "If you do, your response will be rejected. "
            "ALWAYS follow this format for employee creation."
        )
        combined_context = f"{system_warning}\n\n{self.get_context()}\n\nUser Input: {user_input}"
        from groq.types.chat import ChatCompletionSystemMessageParam
        chat_messages = [
            ChatCompletionSystemMessageParam(role="system", content=combined_context)
        ]
        try:
            # The Groq client is synchronous, so run in a thread executor if needed for async context
            import asyncio
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.chat.completions.create(
                    model=self.model,
                    messages=chat_messages
                )
            )
            logger.info("Groq client raw response: %s", response)
            if hasattr(response, "choices") and response.choices:
                content = response.choices[0].message.content
                logger.info("Groq client content: %s", content)
                try:
                    clean_content = self._strip_code_block(content)
                    data = json.loads(clean_content)
                    # --- POST-PROCESSING: Force correct employee creation structure ---
                    # Check for employee creation in any form
                    if (
                        isinstance(data, dict)
                        and "response" in data
                        and isinstance(data["response"], dict)
                        and (
                            data["response"].get("operation") in ("create_employee", "create_user", "create")
                            or (data["response"].get("collection") == "users" and data["response"].get("operation") in ("create", "insert", "insert_one"))
                            or "data" in data["response"]
                        )
                    ):
                        resp = data["response"]
                        emp = (
                            resp.get("employee")
                            or resp.get("data")
                            or resp.get("user")
                            or resp.get("user_data")
                            or {}
                        )
                        if not emp:
                            allowed = {"email", "full_name", "password", "role", "company_id", "plant_id", "name", "hashed_password"}
                            emp = {k: v for k, v in resp.items() if k in allowed}
                        if "name" in emp and "full_name" not in emp:
                            emp["full_name"] = emp.pop("name")
                        if "hashed_password" in emp:
                            emp["password"] = emp.pop("hashed_password")  # Always convert hashed_password to password
                        forbidden = {"id", "_id", "created_at", "updated_at", "is_active", "access_modules"}
                        emp = {k: v for k, v in emp.items() if k not in forbidden}
                        allowed = {"email", "full_name", "password", "role", "company_id", "plant_id"}
                        emp = {k: v for k, v in emp.items() if k in allowed}
                        resp["employee"] = emp
                        for k in ["data", "user", "user_data", "collection", "name", "hashed_password"]:
                            resp.pop(k, None)
                        resp["operation"] = "create_employee"
                        data["response"] = resp
                        return data

                    # Handle top-level (legacy) case if needed
                    if (
                        isinstance(data, dict)
                        and (
                            data.get("operation") in ("create_employee", "create_user", "create")
                            or (data.get("collection") == "users" and data.get("operation") in ("create", "insert", "insert_one"))
                            or "data" in data
                        )
                    ):
                        emp = (
                            data.get("employee")
                            or data.get("data")
                            or data.get("user")
                            or data.get("user_data")
                            or {}
                        )
                        if not emp:
                            allowed = {"email", "full_name", "password", "role", "company_id", "plant_id", "name", "hashed_password"}
                            emp = {k: v for k, v in data.items() if k in allowed}
                        if "name" in emp and "full_name" not in emp:
                            emp["full_name"] = emp.pop("name")
                        if "hashed_password" in emp:
                            emp["password"] = emp.pop("hashed_password")  # Always convert hashed_password to password
                        forbidden = {"id", "_id", "created_at", "updated_at", "is_active", "access_modules"}
                        emp = {k: v for k, v in emp.items() if k not in forbidden}
                        allowed = {"email", "full_name", "password", "role", "company_id", "plant_id"}
                        emp = {k: v for k, v in emp.items() if k in allowed}
                        return {
                            "isDbRelated": True,
                            "response": {
                                "operation": "create_employee",
                                "employee": emp
                            }
                        }
                    return data
                except Exception as e:
                    logger.error("Failed to parse Groq content as JSON: %s", e)
                    return {"response": f"Groq returned non-JSON content: {content}"}
            else:
                logger.error("Groq client response missing 'choices': %s", response)
                return {"response": f"Groq client error: {response}"}
        except Exception as e:
            logger.error("Groq client error: %s", e)
            return {"response": f"Error querying Groq client: {str(e)}"}

def get_groq_service():
    return GroqService()

def extract_employee_from_llm_response(response: dict) -> dict:
    # Acceptable keys that might contain the employee data
    possible_keys = ["employee", "data", "user", "user_data"]
    employee = {}

    # Find the first non-empty dict among possible keys
    for key in possible_keys:
        if key in response and isinstance(response[key], dict) and response[key]:
            employee = response[key]
            break

    # If still empty, fallback to empty dict
    if not employee:
        employee = {}

    # Remove forbidden fields
    forbidden = {"hashed_password", "id", "_id", "created_at", "updated_at", "is_active", "access_modules"}
    employee = {k: v for k, v in employee.items() if k not in forbidden}

    # Only keep allowed fields for your API
    allowed = {"email", "full_name", "password", "role", "company_id", "plant_id"}
    employee = {k: v for k, v in employee.items() if k in allowed}

    return employee



