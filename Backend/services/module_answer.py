from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.module_answer import ModuleAnswer, ModuleAnswerCreate, ModuleAnswerUpdate
from datetime import datetime
import uuid
from fastapi import HTTPException, status
from pymongo.operations import UpdateOne

class ModuleAnswerService:
    def __init__(self, db: AsyncIOMotorDatabase, module_id: str):
        self.db = db
        self.module_id = module_id
        # Collection name is based on module_id to ensure uniqueness
        self.collection_name = f"module_answers_{module_id}"
        self.collection = db[self.collection_name]
    
    async def setup_collection(self):
        """Set up the collection with appropriate indexes"""
        # Create indexes for efficient querying
        await self.collection.create_index(
            [("company_id", 1), ("financial_year", 1)],
            unique=True
        )
        await self.collection.create_index("status")
        await self.collection.create_index("validation_status")
        
    async def create_answer(self, answer_data: ModuleAnswerCreate) -> ModuleAnswer:
        """Create a new answer for this module"""
        # Check if answer already exists for this company and financial year
        existing = await self.collection.find_one({
            "company_id": answer_data.company_id,
            "financial_year": answer_data.financial_year
        })
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Answer already exists for this company and financial year"
            )
        
        # Create answer document
        answer_dict = answer_data.model_dump()
        answer_dict["_id"] = str(uuid.uuid4())
        answer_dict["id"] = answer_dict["_id"]
        answer_dict["created_at"] = datetime.utcnow()
        answer_dict["updated_at"] = answer_dict["created_at"]
        
        # Insert into database
        await self.collection.insert_one(answer_dict)
        
        return ModuleAnswer(**answer_dict)
    
    async def bulk_create_answers(self, answers_data: List[ModuleAnswerCreate]) -> List[ModuleAnswer]:
        """Create multiple answers for this module in bulk
        
        This method is more efficient than calling create_answer multiple times
        as it minimizes database round trips.
        """
        if not answers_data:
            return []
            
        # Check for duplicates within the bulk request
        unique_keys = set()
        for answer_data in answers_data:
            key = (answer_data.company_id, answer_data.financial_year)
            if key in unique_keys:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Duplicate entry for company_id={answer_data.company_id}, financial_year={answer_data.financial_year}"
                )
            unique_keys.add(key)
        
        # Check for existing answers
        query_conditions = []
        for answer_data in answers_data:
            query_conditions.append({
                "company_id": answer_data.company_id,
                "financial_year": answer_data.financial_year
            })
            
        if query_conditions:
            existing_answers = []
            async for doc in self.collection.find({"$or": query_conditions}):
                existing_answers.append(doc)
                
            if existing_answers:
                # Format the error message with details of existing answers
                existing_details = [f"company_id={doc['company_id']}, financial_year={doc['financial_year']}" 
                                   for doc in existing_answers]
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"The following answers already exist: {', '.join(existing_details)}"
                )
        
        # Prepare documents for insertion
        now = datetime.utcnow()
        documents_to_insert = []
        created_answers = []
        
        for answer_data in answers_data:
            answer_dict = answer_data.model_dump()
            answer_dict["_id"] = str(uuid.uuid4())
            answer_dict["id"] = answer_dict["_id"]
            answer_dict["created_at"] = now
            answer_dict["updated_at"] = now
            
            documents_to_insert.append(answer_dict)
            created_answers.append(ModuleAnswer(**answer_dict))
        
        # Insert all documents in one operation
        if documents_to_insert:
            await self.collection.insert_many(documents_to_insert)
        
        return created_answers
    
    async def get_answer(self, company_id: str, financial_year: str) -> Optional[ModuleAnswer]:
        """Get answer for a specific company and financial year"""
        answer = await self.collection.find_one({
            "company_id": company_id,
            "financial_year": financial_year
        })
        
        if not answer:
            return None
        
        return ModuleAnswer(**answer)
    
    async def update_answer(self, 
                          company_id: str, 
                          financial_year: str, 
                          update_data: ModuleAnswerUpdate) -> Optional[ModuleAnswer]:
        """Update an existing answer"""
        # Check if answer exists
        existing = await self.get_answer(company_id, financial_year)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Answer not found"
            )
        
        # Prepare update data
        update_dict = update_data.model_dump(exclude_unset=True)
        update_dict["updated_at"] = datetime.utcnow()
        
        # Handle answers field specially to merge instead of replace
        update_operations = {}
        
        # If answers field is present in the update data
        if "answers" in update_dict:
            answers_update = update_dict.pop("answers")
            
            # For each question ID in the answers update
            for question_id, answer_value in answers_update.items():
                # Set the specific question's answer
                update_operations[f"answers.{question_id}"] = answer_value
        
        # Add remaining fields to the update operations
        for key, value in update_dict.items():
            update_operations[key] = value
        
        # Update in database
        result = await self.collection.update_one(
            {
                "company_id": company_id,
                "financial_year": financial_year
            },
            {"$set": update_operations}
        )
        
        if result.modified_count == 0:
            return None
        
        # Get updated answer
        return await self.get_answer(company_id, financial_year)
    
    async def bulk_update_answers(self, updates: List[Dict[str, Any]]) -> List[ModuleAnswer]:
        """Update multiple answers in bulk
        
        Each update dict must contain:
        - company_id: str
        - financial_year: str
        - update_data: Dict containing the fields to update
        """
        if not updates:
            return []
            
        updated_answers = []
        now = datetime.utcnow()
        
        for update in updates:
            company_id = update.get("company_id")
            financial_year = update.get("financial_year")
            update_data = update.get("update_data", {})
            
            if not all([company_id, financial_year, update_data]):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Each update must contain company_id, financial_year, and update_data"
                )
            
            # Check if answer exists
            existing = await self.collection.find_one({
                "company_id": company_id,
                "financial_year": financial_year
            })
            
            if not existing:
                continue  # Skip non-existent answers
            
            # Add updated_at timestamp
            update_data["updated_at"] = now
            
            # Handle answers field specially to merge instead of replace
            update_operations = {}
            
            # If answers field is present in the update data
            if "answers" in update_data:
                answers_update = update_data.pop("answers")
                
                # For each question ID in the answers update
                for question_id, answer_value in answers_update.items():
                    # Set the specific question's answer
                    update_operations[f"answers.{question_id}"] = answer_value
            
            # Add remaining fields to the update operations
            for key, value in update_data.items():
                update_operations[key] = value
            
            # Update in database
            await self.collection.update_one(
                {
                    "company_id": company_id,
                    "financial_year": financial_year
                },
                {"$set": update_operations}
            )
            
            # Get updated answer
            updated_answer = await self.get_answer(company_id, financial_year)
            if updated_answer:
                updated_answers.append(updated_answer)
        
        return updated_answers
    
    async def list_answers(self, 
                         company_id: Optional[str] = None, 
                         financial_year: Optional[str] = None,
                         status: Optional[str] = None,
                         skip: int = 0,
                         limit: int = 100) -> List[ModuleAnswer]:
        """List answers with optional filtering"""
        # Build filter
        filter_dict = {}
        if company_id:
            filter_dict["company_id"] = company_id
        if financial_year:
            filter_dict["financial_year"] = financial_year
        if status:
            filter_dict["status"] = status
        
        # Query database
        cursor = self.collection.find(filter_dict).skip(skip).limit(limit)
        answers = []
        async for answer in cursor:
            answers.append(ModuleAnswer(**answer))
        
        return answers
    
    async def sync_question_ids(self, question_ids: List[str]) -> bool:
        """Synchronize all module answers with the provided list of question IDs
        
        This ensures that all module answers have entries for all questions in the module,
        and removes entries for questions that no longer exist in the module.
        
        Args:
            question_ids: List of question IDs that should be in each answer
            
        Returns:
            Boolean indicating success
        """
        # Get all existing answers
        answers = []
        async for answer in self.collection.find({}):
            answers.append(answer)
        
        if not answers:
            return True  # No answers to sync
        
        # For each answer, ensure it has all question IDs and remove any that aren't in the list
        bulk_operations = []
        now = datetime.utcnow()
        
        for answer in answers:
            update_operations = {}
            answer_question_ids = set(answer.get("answers", {}).keys())
            
            # Add missing question IDs
            for qid in question_ids:
                if qid not in answer_question_ids:
                    update_operations[f"answers.{qid}"] = None
            
            # Remove question IDs that are no longer in the module
            for qid in answer_question_ids:
                if qid not in question_ids:
                    update_operations[f"answers.{qid}"] = None
            
            if update_operations:
                # Add updated timestamp
                update_operations["updated_at"] = now
                
                # Create update operation
                bulk_operations.append(
                    UpdateOne(
                        {"_id": answer["_id"]},
                        {"$set": update_operations}
                    )
                )
        
        # Execute bulk operations if there are any
        if bulk_operations:
            result = await self.collection.bulk_write(bulk_operations)
            return result.modified_count > 0
        
        return True