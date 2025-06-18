from typing import Dict, Any, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from models.question import QuestionType, TableMetadata
from models.plant import PlantType
from models.environment import QuestionAnswer

class AggregationService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.environment

    async def get_company_aggregator_plant(self, company_id: str) -> Optional[Dict[str, Any]]:
        """Get the C001 (aggregator) plant for a company"""
        return await self.db.plants.find_one({
            "company_id": company_id,
            "plant_code": "C001",
            "plant_type": PlantType.AGGREGATOR.value
        })

    async def get_company_home_plant(self, company_id: str) -> Optional[Dict[str, Any]]:
        """Get the P001 (home) plant for a company"""
        return await self.db.plants.find_one({
            "company_id": company_id,
            "plant_code": "P001",
            "plant_type": PlantType.HOME.value
        })

    async def get_all_regular_plants(self, company_id: str) -> List[Dict[str, Any]]:
        """Get all plants for a company except C001"""
        cursor = self.db.plants.find({
            "company_id": company_id,
            "plant_code": {"$ne": "C001"}
        })
        return await cursor.to_list(length=None)

    async def get_question_type(self, question_id: str) -> Optional[str]:
        """Get the type of a question (subjective or tabular)"""
        # First try with the ID as is
        question = await self.db.questions.find_one({"id": question_id})
        if not question:
            # Try with _id if id doesn't work
            question = await self.db.questions.find_one({"_id": question_id})
        
        if not question:
            # If still not found, check if it's in human_readable_id
            question = await self.db.questions.find_one({"human_readable_id": question_id})
        
        return question.get("question_type") if question else None

    def is_subjective_answer(self, answer_data: Dict[str, Any]) -> bool:
        """Determine if an answer is subjective based on its data structure"""
        if isinstance(answer_data, dict):
            # Check if it's a direct subjective answer
            if answer_data.get("type") == "subjective":
                return True
            # Check if it's nested in updatedData
            if isinstance(answer_data.get("updatedData"), dict):
                return answer_data["updatedData"].get("type") == "subjective"
        return False

    def is_table_answer(self, answer_data: Dict[str, Any]) -> bool:
        """Determine if an answer is tabular based on its data structure"""
        if isinstance(answer_data, dict):
            data = answer_data.get("updatedData", answer_data)
            # Check if it's a list of rows with current_year/previous_year
            if isinstance(data, list) and data:
                first_row = data[0]
                return isinstance(first_row, dict) and "current_year" in first_row
        return False

    async def is_aggregator_plant(self, company_id: str, plant_id: str) -> bool:
        """Check if the given plant is the C001 (aggregator) plant"""
        plant = await self.db.plants.find_one({
            "company_id": company_id,
            "id": plant_id
        })
        return plant and plant.get("plant_code") == "C001"

    async def aggregate_answers(
        self,
        company_id: str,
        financial_year: str,
        question_id: str,
        question_title: str,
        answer_data: Dict[str, Any],
        source_plant_id: Optional[str] = None  # Added to track which plant triggered the update
    ) -> None:
        """
        Aggregate answers from all plants into C001 plant.
        This is called whenever any plant's answer is updated.
        """
        now = datetime.utcnow()
        
        # Get the aggregator plant (C001)
        aggregator_plant = await self.get_company_aggregator_plant(company_id)
        if not aggregator_plant:
            print(f"Aggregator plant not found for company {company_id}")
            return

        # If this update is coming from C001 itself, just update the answer and return
        if source_plant_id and await self.is_aggregator_plant(company_id, source_plant_id):
            print(f"Direct update to C001 for question {question_id}")
            question_answer = {
                "questionId": question_id,
                "questionTitle": question_title,
                "updatedData": answer_data.get("updatedData", answer_data),
                "lastUpdated": now
            }
            
            await self.collection.update_one(
                {
                    "companyId": company_id,
                    "plantId": aggregator_plant["id"],
                    "financialYear": financial_year
                },
                {
                    "$set": {
                        f"answers.{question_id}": question_answer,
                        "updatedAt": now
                    }
                }
            )
            print(f"Successfully updated C001's answer directly for question {question_id}")
            return

        # Get the home plant (P001)
        home_plant = await self.get_company_home_plant(company_id)
        if not home_plant:
            print(f"Home plant not found for company {company_id}")
            return

        # First try to get question type from database
        question_type = await self.get_question_type(question_id)
        
        # If question type not found in database, determine it from answer structure
        if not question_type:
            print(f"Question type not found in database for {question_id}, determining from answer structure")
            if self.is_subjective_answer(answer_data):
                question_type = QuestionType.TEXT.value
                print(f"Determined {question_id} is a subjective question")
            elif self.is_table_answer(answer_data):
                question_type = QuestionType.TABLE.value
                print(f"Determined {question_id} is a table question")
            else:
                print(f"Could not determine question type for {question_id}")
                return

        print(f"Processing question {question_id} of type {question_type}")

        # For subjective questions, copy P001's answer to C001
        if question_type == QuestionType.TEXT.value:
            print(f"Handling subjective question {question_id}")
            # Get P001's answer
            home_report = await self.collection.find_one({
                "companyId": company_id,
                "plantId": home_plant["id"],
                "financialYear": financial_year
            })
            
            if home_report and home_report.get("answers", {}).get(question_id):
                print(f"Found P001's answer for question {question_id}")
                home_answer = home_report["answers"][question_id]
                
                # Create a new question answer object with the correct structure
                question_answer = {
                    "questionId": question_id,
                    "questionTitle": question_title,
                    "updatedData": {
                        "type": "subjective",
                        "text": home_answer["updatedData"]["text"]
                    },
                    "lastUpdated": now
                }
                
                # Copy P001's answer to C001
                await self.collection.update_one(
                    {
                        "companyId": company_id,
                        "plantId": aggregator_plant["id"],
                        "financialYear": financial_year
                    },
                    {
                        "$set": {
                            f"answers.{question_id}": question_answer,
                            "updatedAt": now
                        }
                    }
                )
                print(f"Copied P001's answer to C001 for question {question_id}")
            else:
                print(f"No answer found in P001 for question {question_id}")
        
        # For tabular questions, aggregate data from all plants
        elif question_type == QuestionType.TABLE.value:
            print(f"Handling tabular question {question_id}")
            # Get all plants except C001
            all_plants = await self.get_all_regular_plants(company_id)
            
            # Initialize aggregated data structure based on the first plant's data
            aggregated_data = []
            
            # Collect answers from all plants
            for plant in all_plants:
                plant_report = await self.collection.find_one({
                    "companyId": company_id,
                    "plantId": plant["id"],
                    "financialYear": financial_year
                })
                
                if not plant_report:
                    continue
                
                plant_answer = plant_report.get("answers", {}).get(question_id, {})
                plant_data = plant_answer.get("updatedData", [])
                
                # If this is the first plant with data, use its structure
                if not aggregated_data and plant_data:
                    aggregated_data = [{"current_year": "0", "previous_year": "0"} for _ in plant_data]
                
                # Add this plant's data to the aggregated data
                for i, row in enumerate(plant_data):
                    if i < len(aggregated_data):
                        try:
                            # Convert to float for numeric addition
                            current_year = float(aggregated_data[i]["current_year"] or 0) + float(row.get("current_year") or 0)
                            previous_year = float(aggregated_data[i]["previous_year"] or 0) + float(row.get("previous_year") or 0)
                            
                            # Convert back to string with 2 decimal places
                            aggregated_data[i]["current_year"] = f"{current_year:.2f}"
                            aggregated_data[i]["previous_year"] = f"{previous_year:.2f}"
                        except (ValueError, TypeError):
                            # If conversion fails, skip this row
                            continue
            
            # Create question answer object for aggregated data
            question_answer = {
                "questionId": question_id,
                "questionTitle": question_title,
                "updatedData": aggregated_data,
                "lastUpdated": now
            }
            
            # Update C001's answer with aggregated data
            await self.collection.update_one(
                {
                    "companyId": company_id,
                    "plantId": aggregator_plant["id"],
                    "financialYear": financial_year
                },
                {
                    "$set": {
                        f"answers.{question_id}": question_answer,
                        "updatedAt": now
                    }
                }
            )
            print(f"Updated aggregated data in C001 for question {question_id}") 