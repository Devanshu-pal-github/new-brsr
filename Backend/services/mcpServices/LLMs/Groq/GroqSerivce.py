
import json
import os
from google import genai
from google.genai import types
from services.mcpServices.LLMs.Groq.Context import GroqContext
from services.mcpServices.LLMs.Groq.LoggerService import get_logger

logger = get_logger("MCP.OpenRouterService")

GEMINI_API_KEY_MCP = os.getenv("GEMINI_API_KEY_MCP")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")  # Default to Gemini 2.0 Flash




class GeminiService:
    def __init__(self):
        self.api_key = GEMINI_API_KEY_MCP
        self.model = GEMINI_MODEL
        self.client = genai.Client(api_key=self.api_key)


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


    # ...existing code for query method...



    async def query(self, messages):
        user_input = messages[0].get("content", "") if messages else ""
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
        prompt = combined_context
        generate_content_config = types.GenerateContentConfig(
            response_mime_type="text/plain",
        )
        try:
            import asyncio
            loop = asyncio.get_event_loop()
            def run_gemini():
                # Use streaming for consistency with reference
                result = ""
                for chunk in self.client.models.generate_content_stream(
                    model=self.model,
                    contents=prompt,
                    config=generate_content_config,
                ):
                    if hasattr(chunk, "text") and chunk.text:
                        result += chunk.text
                return result
            response_text = await loop.run_in_executor(None, run_gemini)
            logger.info("Gemini client content: %s", response_text)
            try:
                clean_content = self._strip_code_block(response_text)
                data = json.loads(clean_content)

                # --- POST-PROCESSING: Plant count queries ---
                if (
                    user_input and any(kw in user_input.lower() for kw in ["how many plants", "plant count", "number of plants", "count of plants"])
                    and isinstance(data, dict)
                    and "response" in data
                    and isinstance(data["response"], dict)
                    and data["response"].get("collection") == "companies"
                    and "query" in data["response"]
                ):
                    # Extract company identifier from query
                    query = data["response"]["query"]
                    company_id = query.get("id") or query.get("_id")
                    company_code = query.get("code")
                    company_name = None
                    # Regex query for name
                    if "name" in query:
                        if isinstance(query["name"], dict) and "$regex" in query["name"]:
                            company_name = query["name"]["$regex"]
                        elif isinstance(query["name"], str):
                            company_name = query["name"]
                    count_query = {
                        "operation": "count_plants"
                    }
                    if company_id:
                        count_query["company_id"] = company_id
                    elif company_code:
                        count_query["company_code"] = company_code
                    elif company_name:
                        count_query["company_name"] = company_name
                    # Return the count_plants operation for ToolService, wrapped for DB handler
                    return {"isDbRelated": True, "response": count_query}

                # --- POST-PROCESSING: Emissions queries ---
                # Detect if user is asking for total CO2 emissions (by company/plant name, year, scope, etc.)
                emissions_keywords = [
                    "co2 emissions", "total co2", "total emissions", "scope 1", "scope 2", "scope one", "scope two", "ghg emissions", "carbon emissions"
                ]
                # If the LLM output is a direct MongoDB query for companies and the user asked about emissions, convert it
                if (
                    user_input and any(kw in user_input.lower() for kw in emissions_keywords)
                    and isinstance(data, dict)
                    and "response" in data
                    and isinstance(data["response"], dict)
                    and data["response"].get("collection") == "companies"
                    and "query" in data["response"]
                ):
                    # Try to extract company name from the query
                    query = data["response"]["query"]
                    company_name = None
                    if "name" in query:
                        if isinstance(query["name"], dict) and "$regex" in query["name"]:
                            company_name = query["name"]["$regex"]
                        elif isinstance(query["name"], str):
                            company_name = query["name"]
                    emissions_query = {
                        "operation": "get_total_emissions"
                    }
                    if company_name:
                        emissions_query["company_name"] = company_name
                    return {"isDbRelated": True, "response": emissions_query}

                # Normal emissions post-processing (if LLM output is already correct)
                if user_input and any(kw in user_input.lower() for kw in emissions_keywords):
                    # Try to extract company/plant name, year, scope from LLM output or user input
                    company_name = None
                    plant_name = None
                    financial_year = None
                    scope = None
                    if isinstance(data, dict):
                        if "response" in data and isinstance(data["response"], dict):
                            resp = data["response"]
                            if "company_name" in resp:
                                company_name = resp["company_name"]
                            if "plant_name" in resp:
                                plant_name = resp["plant_name"]
                            if "financial_year" in resp:
                                financial_year = resp["financial_year"]
                            if "scope" in resp:
                                scope = resp["scope"]
                        if "query" in data:
                            q = data["query"]
                            if "name" in q:
                                if isinstance(q["name"], dict) and "$regex" in q["name"]:
                                    company_name = q["name"]["$regex"]
                                elif isinstance(q["name"], str):
                                    company_name = q["name"]
                            if "plant_name" in q:
                                if isinstance(q["plant_name"], dict) and "$regex" in q["plant_name"]:
                                    plant_name = q["plant_name"]["$regex"]
                                elif isinstance(q["plant_name"], str):
                                    plant_name = q["plant_name"]
                            if "financial_year" in q:
                                financial_year = q["financial_year"]
                            if "scope" in q:
                                scope = q["scope"]
                    import re
                    year_match = re.search(r"20\d{2}-20\d{2}", user_input)
                    if year_match:
                        financial_year = year_match.group(0)
                    if not scope:
                        if "scope 1" in user_input.lower() or "scope one" in user_input.lower():
                            scope = "Scope 1"
                        elif "scope 2" in user_input.lower() or "scope two" in user_input.lower():
                            scope = "Scope 2"
                        elif "both scopes" in user_input.lower() or "all scopes" in user_input.lower():
                            scope = ["Scope 1", "Scope 2"]
                    if company_name or plant_name:
                        emissions_query = {
                            "operation": "get_total_emissions"
                        }
                        if company_name:
                            emissions_query["company_name"] = company_name
                        if plant_name:
                            emissions_query["plant_name"] = plant_name
                        if financial_year:
                            emissions_query["financial_year"] = financial_year
                        if scope:
                            emissions_query["scope"] = scope
                        return {"isDbRelated": True, "response": emissions_query}

                # ...existing post-processing logic for employee/plant creation, deletion, etc...
                return data
            except Exception as e:
                logger.error("Failed to parse Gemini content as JSON: %s", e)
                return {"response": f"Gemini returned non-JSON content: {response_text}"}
        except Exception as e:
            logger.error("Gemini client error: %s", e)
            return {"response": f"Error querying Gemini client: {str(e)}"}



# For backward compatibility, alias the new service and factory to the old names
GroqService = GeminiService
def get_groq_service():
    return GeminiService()

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



