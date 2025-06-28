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
        # Inject a critical system warning for employee and plant creation at the very top
        system_warning = (
            "🚨 FOR EMPLOYEE CREATION: ONLY output {\"operation\": \"create_employee\", ...}. "
            "Never use 'update', 'upsert', 'insert', 'insert_one', or 'hashed_password'. "
            "If you do, your response will be rejected. "
            "ALWAYS follow this format for employee creation.\n"
            "🚨 FOR PLANT CREATION: ONLY output {\"operation\": \"create_plant\", ...}. "
            "Never use 'update', 'upsert', 'insert', 'insert_one', or 'plant_code'. "
            "If you do, your response will be rejected. "
            "ALWAYS follow this format for plant creation."
        )
        combined_context = f"{system_warning}\n\n{self.get_context()}\n\nUser Input: {user_input}"
        from groq.types.chat import ChatCompletionSystemMessageParam
        chat_messages = [
            ChatCompletionSystemMessageParam(role="system", content=combined_context)
        ]
        try:
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
                    # --- POST-PROCESSING: Force correct employee or plant creation structure ---
                    # EMPLOYEE CREATION (existing logic)
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
                            emp["password"] = emp.pop("hashed_password")
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
                    # PLANT CREATION (new logic)
                    if (
                        isinstance(data, dict)
                        and "response" in data
                        and isinstance(data["response"], dict)
                        and (
                            data["response"].get("operation") in ("create_plant", "create")
                            or (data["response"].get("collection") == "plants" and data["response"].get("operation") in ("create", "insert", "insert_one"))
                            or "data" in data["response"]
                        )
                    ):
                        resp = data["response"]
                        plant = (
                            resp.get("plant")
                            or resp.get("data")
                            or resp.get("plant_data")
                            or {}
                        )
                        if not plant:
                            allowed = {"company_id", "name", "code", "type", "address", "contact_email", "contact_phone", "metadata", "plant_code"}
                            plant = {k: v for k, v in resp.items() if k in allowed}
                        if "plant_code" in plant and "code" not in plant:
                            plant["code"] = plant.pop("plant_code")
                        forbidden = {"id", "_id", "created_at", "updated_at", "is_active", "access_modules"}
                        plant = {k: v for k, v in plant.items() if k not in forbidden}
                        allowed = {"company_id", "name", "code", "type", "address", "contact_email", "contact_phone", "metadata"}
                        plant = {k: v for k, v in plant.items() if k in allowed}
                        # Ensure metadata is always a dict
                        if "metadata" not in plant or not isinstance(plant["metadata"], dict):
                            plant["metadata"] = {}
                        resp["plant"] = plant
                        for k in ["data", "plant_data", "collection", "plant_code"]:
                            resp.pop(k, None)
                        resp["operation"] = "create_plant"
                        data["response"] = resp
                        return data
                    # Handle top-level (legacy) case if needed
                    if (
                        isinstance(data, dict)
                        and (
                            data.get("operation") in ("create_employee", "create_user", "create_plant", "create")
                            or (data.get("collection") in ("users", "plants") and data.get("operation") in ("create", "insert", "insert_one"))
                            or "data" in data
                        )
                    ):
                        # Employee legacy
                        # Accept both flat/camelCase and nested employee dicts
                        emp = (
                            data.get("employee")
                            or data.get("data")
                            or data.get("user")
                            or data.get("user_data")
                            or data
                        )
                        # Robust mapping for camelCase and snake_case keys
                        def get_first_emp(*keys):
                            for k in keys:
                                if k in emp and emp[k] is not None:
                                    return emp[k]
                            return None

                        mapped_emp = {
                            "email": get_first_emp("email"),
                            "full_name": get_first_emp("full_name", "name"),
                            "password": get_first_emp("password", "hashed_password"),
                            "role": get_first_emp("role"),
                            "company_id": get_first_emp("company_id", "companyId"),
                            "plant_id": get_first_emp("plant_id", "plantId"),
                        }
                        # Remove None values
                        mapped_emp = {k: v for k, v in mapped_emp.items() if v is not None}
                        forbidden = {"id", "_id", "created_at", "updated_at", "is_active", "access_modules"}
                        mapped_emp = {k: v for k, v in mapped_emp.items() if k not in forbidden}
                        allowed = {"email", "full_name", "password", "role", "company_id", "plant_id"}
                        mapped_emp = {k: v for k, v in mapped_emp.items() if k in allowed}
                        # Only return if required fields are present
                        if "email" in mapped_emp and "role" in mapped_emp and "company_id" in mapped_emp and "plant_id" in mapped_emp:
                            return {
                                "isDbRelated": True,
                                "response": {
                                    "operation": "create_employee",
                                    "employee": mapped_emp
                                }
                            }
                        # Plant legacy (flat keys from LLM)
                        plant = (
                            data.get("plant")
                            or data.get("data")
                            or data.get("plant_data")
                            or {}
                        )
                        # If plant is empty, but we see flat keys like plantName, plantCode, etc., map them (including camelCase)
                        flat_plant_keys = {"companyId", "plantName", "plantCode", "plantType", "address", "email", "phone"}
                        if (
                            data.get("operation") == "create_plant"
                            and any(k in data for k in flat_plant_keys)
                        ):
                            # Map flat/camelCase keys to correct nested structure (robust mapping)
                            def get_first(*keys):
                                for k in keys:
                                    if k in data and data[k] is not None:
                                        return data[k]
                                return None

                            plant = {
                                "company_id": get_first("company_id", "companyId"),
                                "name": get_first("name", "plantName"),
                                "code": get_first("code", "plantCode"),
                                "type": get_first("type", "plantType"),
                                "address": get_first("address"),
                                "contact_email": get_first("contact_email", "email"),
                                "contact_phone": get_first("contact_phone", "phone"),
                                "metadata": data.get("metadata") if isinstance(data.get("metadata"), dict) else {},
                            }
                            # Remove None values
                            plant = {k: v for k, v in plant.items() if v is not None}
                            # Ensure required fields
                            if "company_id" in plant and "code" in plant:
                                return {
                                    "isDbRelated": True,
                                    "response": {
                                        "operation": "create_plant",
                                        "plant": plant
                                    }
                                }
                        # Plant legacy (already nested)
                        if "company_id" in plant and "code" in plant:
                            if not plant:
                                allowed = {"company_id", "name", "code", "type", "address", "contact_email", "contact_phone", "metadata", "plant_code"}
                                plant = {k: v for k, v in data.items() if k in allowed}
                            if "plant_code" in plant and "code" not in plant:
                                plant["code"] = plant.pop("plant_code")
                            forbidden = {"id", "_id", "created_at", "updated_at", "is_active", "access_modules"}
                            plant = {k: v for k, v in plant.items() if k not in forbidden}
                            allowed = {"company_id", "name", "code", "type", "address", "contact_email", "contact_phone", "metadata"}
                            plant = {k: v for k, v in plant.items() if k in allowed}
                            if "metadata" not in plant or not isinstance(plant["metadata"], dict):
                                plant["metadata"] = {}
                            return {
                                "isDbRelated": True,
                                "response": {
                                    "operation": "create_plant",
                                    "plant": plant
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



