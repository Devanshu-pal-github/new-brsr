
from services.mcpServices.LLMs.Groq.LoggerService import get_logger

logger = get_logger("MCP.ToolService")

def print_debug_query(query, user_prompt, projection=None, collection=None, operation=None):
    logger.info(f"Executing MongoDB query: {query} | Projection: {projection} | Collection: {collection} | Operation: {operation} | User prompt: {user_prompt}")

class ToolService:

    def _handle_get_total_emissions(self, query_obj, user_prompt=""):
        """Handle total CO2 emissions queries by company/plant name or ID, year, and scope."""
        try:
            import re
            db = self.db
            if db is None:
                return {"error": "Database connection not initialized."}
            # Accept company_name, company_id, plant_name, plant_id, financial_year, scope
            company_id = query_obj.get("company_id")
            company_name = query_obj.get("company_name")
            plant_id = query_obj.get("plant_id")
            plant_name = query_obj.get("plant_name")
            financial_year = query_obj.get("financial_year")
            scope = query_obj.get("scope")  # Can be "Scope 1", "Scope 2", or None (for both)

            def normalize_name(name):
                # Remove periods, spaces, and lowercase
                return re.sub(r'[^a-z0-9]', '', name.lower()) if name else ''

            # Resolve company_name to company_id if needed
            if not company_id and company_name:
                companies = list(db["companies"].find({}))
                norm_input = normalize_name(company_name)
                matched = None
                for c in companies:
                    db_name = c.get("name", "")
                    if normalize_name(db_name) == norm_input:
                        matched = c
                        break
                if not matched:
                    return {"error": f"Company '{company_name}' not found"}
                # Use the normal 'id' field (not _id) for company_id matching in ghg_reports
                company_id = matched.get("id") or str(matched.get("_id"))

            # Resolve plant_name to plant_id if needed
            if not plant_id and plant_name:
                plant_doc = db["plants"].find_one({"plant_name": {"$regex": f"^{plant_name}$", "$options": "i"}})
                if not plant_doc:
                    return {"error": f"Plant '{plant_name}' not found"}
                plant_id = plant_doc["id"]
                # If company_id not set, get from plant
                if not company_id:
                    company_id = plant_doc.get("company_id")


            # If only company_id is given, get all plant_ids for that company
            plant_ids = []
            if company_id and not plant_id:
                # Find company by 'id' field (not _id)
                company_doc = db["companies"].find_one({"id": company_id})
                if not company_doc:
                    return {"error": f"Company with id '{company_id}' not found"}
                plant_ids = company_doc.get("plant_ids", [])
            elif plant_id:
                plant_ids = [plant_id]
            else:
                return {"error": "No company or plant specified for emissions query"}

            # Build query for ghg_reports (must include company_id for robust matching)
            ghg_query = {"company_id": company_id}
            if plant_ids:
                ghg_query["plant_id"] = {"$in": plant_ids}
            if financial_year:
                ghg_query["financial_year"] = financial_year
            if scope:
                if isinstance(scope, str):
                    # For a single scope, match exactly
                    ghg_query["scope"] = {"$eq": scope}
                elif isinstance(scope, list):
                    # For multiple scopes, use $in
                    ghg_query["scope"] = {"$in": scope}

            ghg_reports = list(db["ghg_reports"].find(ghg_query))
            if not ghg_reports:
                return {"error": "No GHG reports found for the specified criteria"}

            # Sum total_scope_emissions_co2e by scope
            total = 0.0
            scope_totals = {}
            for report in ghg_reports:
                s = report.get("scope", "Unknown")
                val = report.get("total_scope_emissions_co2e", 0.0)
                try:
                    val = float(val)
                except Exception:
                    val = 0.0
                total += val
                scope_totals[s] = scope_totals.get(s, 0.0) + val

            result = {
                "company_id": company_id,
                "plant_ids": plant_ids,
                "financial_year": financial_year,
                "scope": scope,
                "total_emissions_co2e": total,
                "scope_breakdown": scope_totals,
            }
            return result
        except Exception as e:
            logger.error(f"Error in get_total_emissions: {str(e)}")
            return {"error": f"Failed to get total emissions: {str(e)}"}
    def _handle_count_plants(self, query_obj, user_prompt=""):
        """Handle count_plants operation: returns the number of plants for a company."""
        try:
            # Accept company_id, company_code, or company_name
            company_id = query_obj.get("company_id")
            company_code = query_obj.get("company_code")
            company_name = query_obj.get("company_name")
            company_query = {}
            if company_id:
                company_query["_id"] = company_id
            elif company_code:
                company_query["code"] = company_code
            elif company_name:
                company_query["name"] = company_name
            else:
                return {"error": "No company identifier provided for count_plants operation"}
            collection = self.db["companies"]
            company_doc = collection.find_one(company_query)
            if not company_doc:
                return {"error": "Company not found"}
            plant_ids = company_doc.get("plant_ids", [])
            return {"plant_count": len(plant_ids), "plant_ids": plant_ids, "company_id": str(company_doc.get("_id")), "company_name": company_doc.get("name")}
        except Exception as e:
            logger.error(f"Error counting plants: {str(e)}")
            return {"error": f"Failed to count plants: {str(e)}"}
    def _handle_delete_plant(self, query_obj, user_prompt=""):
        """Handle delete_plant operation specifically"""
        try:
            plant_id = query_obj.get("plant_id")
            if not plant_id:
                logger.error("No plant_id provided for delete_plant operation")
                return {"error": "No plant_id provided for delete_plant operation"}
            collection = self.db["plants"]
            result = collection.delete_one({"id": plant_id})
            logger.info(f"Delete plant result: deleted={result.deleted_count}")
            return {"deleted": result.deleted_count, "plant_id": plant_id}
        except Exception as e:
            logger.error(f"Error deleting plant: {str(e)}")
            return {"error": f"Failed to delete plant: {str(e)}"}
    def __init__(self, db=None):
        from services.mcpServices.LLMs.Groq.DatabaseService import DatabaseService
        if db is not None:
            self.db = db
        else:
            db_service = DatabaseService()
            self.db = db_service.get_db()

    def db_call(self, query_obj, user_prompt=""):
        try:
            # Handle create_employee operation specially
            if isinstance(query_obj, dict) and query_obj.get("operation") == "create_employee":
                return self._handle_create_employee(query_obj, user_prompt)

            # Handle create_plant operation specially
            if isinstance(query_obj, dict) and query_obj.get("operation") == "create_plant":
                return self._handle_create_plant(query_obj, user_prompt)

            # Handle delete_plant operation specially
            if isinstance(query_obj, dict) and query_obj.get("operation") == "delete_plant":
                return self._handle_delete_plant(query_obj, user_prompt)

            # Handle count_plants operation specially
            if isinstance(query_obj, dict) and query_obj.get("operation") == "count_plants":
                return self._handle_count_plants(query_obj, user_prompt)

            # Handle get_total_emissions operation
            if isinstance(query_obj, dict) and query_obj.get("operation") == "get_total_emissions":
                return self._handle_get_total_emissions(query_obj, user_prompt)
            
            # Handle the case where LLM uses "create" operation on "users" collection (employee creation)
            if (isinstance(query_obj, dict) and 
                query_obj.get("collection") == "users" and 
                query_obj.get("operation") == "create" and 
                "data" in query_obj):
                # Convert to proper create_employee format
                employee_data = query_obj.get("data", {})
                # Convert hashed_password to password if present
                if "hashed_password" in employee_data:
                    employee_data["password"] = employee_data.pop("hashed_password")
                
                converted_query = {
                    "operation": "create_employee",
                    "employee": employee_data
                }
                logger.info(f"Converting LLM 'create' operation to 'create_employee': {converted_query}")
                return self._handle_create_employee(converted_query, user_prompt)
            
            # Support for new format: {"collection": ..., "query": {...}, "projection": {...}, "operation": ...}
            if isinstance(query_obj, dict) and "query" in query_obj and "collection" in query_obj:
                collection_name = query_obj.get("collection")
                query = query_obj.get("query", {})
                projection = query_obj.get("projection")
                operation = query_obj.get("operation")
                update = query_obj.get("update")
            else:
                # fallback to modules if not specified
                collection_name = "modules"
                query = query_obj.get("query", query_obj) if isinstance(query_obj, dict) else query_obj
                projection = query_obj.get("projection") if isinstance(query_obj, dict) else None
                operation = query_obj.get("operation") if isinstance(query_obj, dict) else None
                update = query_obj.get("update") if isinstance(query_obj, dict) else None
            collection = self.db[collection_name]
            print_debug_query(query, user_prompt, projection, collection_name, operation)




            # If this is an update operation
            if update is not None:
                # Defensive: If this is an upsert-style employee creation, reject or convert to insert_one
                # Only allow upsert for non-users collections
                if collection_name == "users" and (query_obj.get("upsert") or (isinstance(update, dict) and ("$set" in update or "$setOnInsert" in update))):
                    logger.error("Received upsert-style or update operation for employee creation. This is forbidden. LLM must use operation: insert_one and document. Rejecting operation.")
                    return {"error": "LLM used forbidden upsert/update pattern for employee creation. Only operation: insert_one with document is allowed."}
                # Replace <current_datetime> placeholder with actual datetime
                import datetime
                from copy import deepcopy
                update_doc = deepcopy(update)
                def replace_datetime(val):
                    if isinstance(val, dict):
                        return {k: replace_datetime(v) for k, v in val.items()}
                    if isinstance(val, str) and "<current_datetime>" in val:
                        return datetime.datetime.utcnow().isoformat()
                    return val
                update_doc = replace_datetime(update_doc)
                logger.info(f"Running update_one: filter={query}, update={update_doc}")
                result = collection.update_one(query, update_doc)
                logger.info(f"Update result: matched={result.matched_count}, modified={result.modified_count}")
                return {"matched": result.matched_count, "modified": result.modified_count}

            # If this is an insert_one operation (employee creation)
            if operation == "insert_one":
                document = query_obj.get("document")
                if not document:
                    logger.error("No document provided for insert_one operation.")
                    return {"error": "No document provided for insert_one operation."}
                logger.info(f"Running insert_one: document={document}")
                result = collection.insert_one(document)
                logger.info(f"Insert result: inserted_id={result.inserted_id}")
                return {"inserted_id": str(result.inserted_id)}

            # If this is a delete_one operation (robust to LLM mistakes)
            if operation in ("delete_one", "delete"):
                if operation == "delete":
                    logger.warning("Received 'delete' operation from LLM, expected 'delete_one'. Proceeding with delete_one for robustness.")
                logger.info(f"Running delete_one: filter={query}")
                result = collection.delete_one(query)
                logger.info(f"Delete result: deleted={result.deleted_count}")
                return {"deleted": result.deleted_count}

            # For count queries
            if operation == "count" or (user_prompt and "count" in user_prompt.lower()):
                count = collection.count_documents(query)
                return {"count": count}
            # For fetching documents
            if projection:
                docs = collection.find(query, projection)
            else:
                docs = collection.find(query)
            docs_list = list(docs)
            # Convert ObjectId and datetime fields to string/isoformat
            for doc in docs_list:
                if "id" in doc:
                    doc["id"] = str(doc.get("id", ""))
                if "created_at" in doc and doc["created_at"]:
                    doc["created_at"] = doc["created_at"].isoformat()
                if "updated_at" in doc and doc["updated_at"]:
                    doc["updated_at"] = doc["updated_at"].isoformat()
            logger.info("Database query result: %s", docs_list)
            return docs_list
        except Exception as e:
            logger.error("Error executing db_call: %s", e)
            return f"Failed to execute query: {str(e)}"

    def _handle_create_employee(self, query_obj, user_prompt=""):
        """Handle create_employee operation specifically"""
        try:
            import datetime
            import uuid
            from services.auth import get_password_hash
            
            # Extract employee data
            employee_data = query_obj.get("employee", {})
            
            if not employee_data:
                logger.error("No employee data provided for create_employee operation")
                return {"error": "No employee data provided for create_employee operation"}
            
            # Validate required fields
            required_fields = ["email", "full_name", "password", "role"]
            missing_fields = [field for field in required_fields if not employee_data.get(field)]
            
            if missing_fields:
                logger.error(f"Missing required fields for employee creation: {missing_fields}")
                return {"error": f"Missing required fields: {', '.join(missing_fields)}"}
            
            # Check if email already exists
            collection = self.db["users"]
            existing_user = collection.find_one({"email": employee_data["email"]})
            if existing_user:
                logger.error(f"Email {employee_data['email']} already exists")
                return {"error": f"Email {employee_data['email']} already registered"}
            
            # Prepare user document
            user_doc = {
                "_id": str(uuid.uuid4()),
                "email": employee_data["email"],
                "full_name": employee_data["full_name"],
                "role": employee_data["role"],
                "hashed_password": get_password_hash(employee_data["password"]),
                "is_active": True,
                "access_modules": [],
                "created_at": datetime.datetime.utcnow(),
                "updated_at": datetime.datetime.utcnow()
            }
            
            # Set id field same as _id
            user_doc["id"] = user_doc["_id"]
            
            # Add company_id and plant_id if provided
            if employee_data.get("company_id"):
                user_doc["company_id"] = employee_data["company_id"]
            
            if employee_data.get("plant_id"):
                user_doc["plant_id"] = employee_data["plant_id"]
            
            # Insert the user
            logger.info(f"Creating employee with document: {user_doc}")
            result = collection.insert_one(user_doc)
            
            logger.info(f"Employee created successfully with ID: {result.inserted_id}")
            return {
                "success": True,
                "message": "Employee created successfully",
                "user_id": str(result.inserted_id),
                "email": employee_data["email"],
                "full_name": employee_data["full_name"],
                "role": employee_data["role"]
            }
            
        except Exception as e:
            logger.error(f"Error creating employee: {str(e)}")
            return {"error": f"Failed to create employee: {str(e)}"}
    
    def _handle_create_plant(self, query_obj, user_prompt=""):
        """Handle create_plant operation specifically"""
        try:
            import datetime
            import uuid
            # Extract plant data
            plant_data = query_obj.get("plant", {})
            if not plant_data:
                logger.error("No plant data provided for create_plant operation")
                return {"error": "No plant data provided for create_plant operation"}
            # Validate required fields
            required_fields = ["company_id", "name", "code", "type", "address", "contact_email", "contact_phone"]
            missing_fields = [field for field in required_fields if not plant_data.get(field)]
            if missing_fields:
                logger.error(f"Missing required fields for plant creation: {missing_fields}")
                return {"error": f"Missing required fields: {', '.join(missing_fields)}"}
            # Reserved code check
            if plant_data["code"] in ["C001", "P001"]:
                logger.error("Reserved plant codes (C001, P001) cannot be used")
                return {"error": "Reserved plant codes (C001, P001) cannot be used"}
            # Check for duplicate code
            collection = self.db["plants"]
            if collection.find_one({"plant_code": plant_data["code"]}):
                logger.error(f"Plant code {plant_data['code']} already exists")
                return {"error": f"Plant code {plant_data['code']} already exists"}
            now = datetime.datetime.utcnow()
            plant_id = str(uuid.uuid4())
            plant_doc = {
                "id": plant_id,
                "plant_code": plant_data["code"],
                "plant_name": plant_data["name"],
                "company_id": plant_data["company_id"],
                "plant_type": plant_data["type"],
                "access_level": "calc_modules_only",
                "address": plant_data["address"],
                "contact_email": plant_data["contact_email"],
                "contact_phone": plant_data["contact_phone"],
                "created_at": now,
                "updated_at": now
            }
            # Insert plant
            collection.insert_one(plant_doc)
            # Insert environment report
            env_report = {
                "id": str(uuid.uuid4()),
                "companyId": plant_data["company_id"],
                "plantId": plant_id,
                "plant_type": plant_data["type"],
                "financialYear": "2024-2025",
                "answers": {},
                "status": "draft",
                "createdAt": now,
                "updatedAt": now,
                "version": 1
            }
            self.db["environment"].insert_one(env_report)
            # Update company's plant_ids
            self.db["companies"].update_one(
                {"_id": plant_data["company_id"]},
                {"$push": {"plant_ids": plant_id}, "$set": {"updated_at": now}}
            )
            logger.info(f"Plant created successfully with ID: {plant_id}")
            return {
                "success": True,
                "message": "Plant created successfully",
                "plant_id": plant_id,
                "name": plant_data["name"],
                "code": plant_data["code"]
            }
        except Exception as e:
            logger.error(f"Error creating plant: {str(e)}")
            return {"error": f"Failed to create plant: {str(e)}"}

def get_tool_service(db=None):
    return ToolService(db)