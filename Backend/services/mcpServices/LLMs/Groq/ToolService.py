from services.mcpServices.LLMs.Groq.LoggerService import get_logger

logger = get_logger("MCP.ToolService")

def print_debug_query(query, user_prompt, projection=None, collection=None, operation=None):
    logger.info(f"Executing MongoDB query: {query} | Projection: {projection} | Collection: {collection} | Operation: {operation} | User prompt: {user_prompt}")

class ToolService:
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

def get_tool_service(db=None):
    return ToolService(db)