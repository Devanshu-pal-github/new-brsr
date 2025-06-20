from typing import Dict, Any, List, Optional, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from models.question import QuestionType, TableMetadata
from models.plant import PlantType
from models.environment import QuestionAnswer
import json
import os
import logging

logger = logging.getLogger(__name__)

class AggregationService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.environment
        self._question_types = None  # Cache for question types
        self._module_data = None  # Cache for module data

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

    def _load_module_data(self) -> Dict[str, Any]:
        """Load and cache the entire moduleData.json"""
        if self._module_data is None:
            try:
                module_data_path = os.path.join(
                    os.path.dirname(__file__),
                    "..",
                    "..",
                    "Frontend",
                    "BRSR",
                    "Environment",
                    "data",
                    "moduleData.json"
                )
                
                with open(module_data_path, 'r') as f:
                    self._module_data = json.load(f)
                logger.info("Successfully loaded moduleData.json")
            except Exception as e:
                logger.error(f"Error loading moduleData.json: {str(e)}")
                self._module_data = {}
        
        return self._module_data

    def _get_question_metadata(self, question_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed question metadata from moduleData.json"""
        module_data = self._load_module_data()
        
        for submodule in module_data.get("submodules", []):
            for category in submodule.get("categories", []):
                for question in category.get("questions", []):
                    if question.get("id") == question_id:
                        return question.get("metadata", {})
        return None

    def _load_question_types(self) -> Dict[str, str]:
        """Load question types from moduleData.json"""
        if self._question_types is None:
            question_types = {}
            module_data = self._load_module_data()
            
            for submodule in module_data.get("submodules", []):
                for category in submodule.get("categories", []):
                    for question in category.get("questions", []):
                        question_id = question.get("id")
                        metadata = question.get("metadata", {})
                        question_type = metadata.get("type")
                        if question_id and question_type:
                            question_types[question_id] = question_type
            
            logger.info(f"Loaded {len(question_types)} question types from moduleData.json")
            self._question_types = question_types
        
        return self._question_types

    def get_question_type(self, question_id: str) -> Optional[str]:
        """Get question type from moduleData.json"""
        question_types = self._load_question_types()
        question_type = question_types.get(question_id)
        
        if question_type == "subjective":
            return QuestionType.SUBJECTIVE.value
        elif question_type == "table":
            return QuestionType.TABLE.value
        
        return None

    def is_subjective_answer(self, answer_data: Dict[str, Any]) -> bool:
        """Determine if an answer is subjective based on its data structure"""
        if isinstance(answer_data, dict):
            if answer_data.get("type") == "subjective":
                return True
            if isinstance(answer_data.get("updatedData"), dict):
                return answer_data["updatedData"].get("type") == "subjective"
        return False

    def is_table_answer(self, answer_data: Dict[str, Any]) -> bool:
        """Determine if an answer is tabular based on its data structure"""
        if isinstance(answer_data, dict):
            data = answer_data.get("updatedData", answer_data)
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

    def _should_aggregate_row(self, row_metadata: Dict[str, Any]) -> bool:
        """Determine if a row should be aggregated based on its metadata"""
        # Don't aggregate header rows
        if row_metadata.get("isHeader"):
            return False
            
        # Don't aggregate rows that are marked as totals (containing "Total" in parameter)
        parameter = row_metadata.get("parameter", "").lower()
        if "total" in parameter or "<b>total" in parameter:
            return False
            
        # Don't aggregate intensity metrics (containing "intensity" in parameter)
        if "intensity" in parameter:
            return False
            
        return True

    def _safe_float_conversion(self, value: Any) -> float:
        """Safely convert a value to float, returning 0 if invalid"""
        if not value:
            return 0.0
        try:
            # Remove any commas and convert to float
            if isinstance(value, str):
                value = value.replace(",", "")
            return float(value)
        except (ValueError, TypeError):
            logger.warning(f"Could not convert value '{value}' to float")
            return 0.0

    async def aggregate_answers(
        self,
        company_id: str,
        financial_year: str,
        question_id: str,
        question_title: str,
        answer_data: Dict[str, Any],
        source_plant_id: Optional[str] = None
    ) -> None:
        """
        Aggregate answers from all plants into C001 plant.
        This is called whenever any plant's answer is updated.
        """
        now = datetime.utcnow()
        
        # Get the aggregator plant (C001)
        aggregator_plant = await self.get_company_aggregator_plant(company_id)
        if not aggregator_plant:
            logger.warning(f"Aggregator plant not found for company {company_id}")
            return

        # If this update is coming from C001 itself, just update the answer and return
        if source_plant_id and await self.is_aggregator_plant(company_id, source_plant_id):
            logger.info(f"Direct update to C001 for question {question_id}")
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
            logger.info(f"Successfully updated C001's answer directly for question {question_id}")
            return

        # Get the home plant (P001)
        home_plant = await self.get_company_home_plant(company_id)
        if not home_plant:
            logger.warning(f"Home plant not found for company {company_id}")
            return

        # Get question type and metadata
        question_type = self.get_question_type(question_id)
        question_metadata = self._get_question_metadata(question_id)
        
        if not question_type:
            logger.warning(f"Question type not found for {question_id} in moduleData.json")
            # Fallback to determining type from answer structure
            if self.is_subjective_answer(answer_data):
                question_type = QuestionType.TEXT.value
                logger.info(f"Determined {question_id} is a subjective question from answer structure")
            elif self.is_table_answer(answer_data):
                question_type = QuestionType.TABLE.value
                logger.info(f"Determined {question_id} is a table question from answer structure")
            else:
                logger.error(f"Could not determine question type for {question_id}")
                return

        logger.info(f"Processing question {question_id} of type {question_type}")

        # For subjective questions, copy P001's answer to C001
        if question_type == QuestionType.SUBJECTIVE.value:
            logger.info(f"Handling subjective question {question_id}")
            # Get P001's answer
            home_report = await self.collection.find_one({
                "companyId": company_id,
                "plantId": home_plant["id"],
                "financialYear": financial_year
            })
            
            if home_report and home_report.get("answers", {}).get(question_id):
                logger.info(f"Found P001's answer for question {question_id}")
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
                logger.info(f"Copied P001's answer to C001 for question {question_id}")
            else:
                logger.warning(f"No answer found in P001 for question {question_id}")
        
        # For tabular questions, aggregate data from all plants
        elif question_type == QuestionType.TABLE.value:
            logger.info(f"Handling tabular question {question_id}")
            
            # Get table structure from metadata
            table_rows = question_metadata.get("rows", [])
            if not table_rows:
                logger.error(f"No table structure found for question {question_id}")
                return

            # Get all plants except C001
            all_plants = await self.get_all_regular_plants(company_id)
            logger.info(f"Found {len(all_plants)} regular plants to aggregate data from")

            # First get C001's existing data
            c001_report = await self.collection.find_one({
                "companyId": company_id,
                "plantId": aggregator_plant["id"],
                "financialYear": financial_year
            })

            # Initialize aggregated data with zeros
            aggregated_data = []
            for row in table_rows:
                aggregated_data.append({
                    "current_year": "0",
                    "previous_year": "0"
                })

            # Collect and aggregate answers from all plants
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
                
                # Skip if no data or invalid structure
                if not isinstance(plant_data, list):
                    logger.warning(f"Invalid data structure for plant {plant['id']}")
                    continue
                
                # Aggregate each row's data
                for i, (row_data, row_metadata) in enumerate(zip(plant_data, table_rows)):
                    if i >= len(aggregated_data):
                        break
                        
                    # Skip rows that shouldn't be aggregated
                    if not self._should_aggregate_row(row_metadata):
                        continue
                    
                    try:
                        # Convert and add current year values
                        current_year_sum = self._safe_float_conversion(row_data.get("current_year"))
                        previous_year_sum = self._safe_float_conversion(row_data.get("previous_year"))
                        
                        # Update aggregated data with formatted values
                        aggregated_data[i]["current_year"] = f"{current_year_sum:.2f}"
                        aggregated_data[i]["previous_year"] = f"{previous_year_sum:.2f}"
                    except Exception as e:
                        logger.error(f"Error aggregating row {i}: {str(e)}")
                        continue
            
            # Calculate totals for rows marked as totals
            for i, row_metadata in enumerate(table_rows):
                if "total" in row_metadata.get("parameter", "").lower():
                    try:
                        # Find the rows to sum (usually the rows above until the previous total)
                        start_idx = 0
                        for j in range(i-1, -1, -1):
                            if "total" in table_rows[j].get("parameter", "").lower():
                                start_idx = j + 1
                                break
                        
                        # Sum the values
                        current_year_total = sum(
                            self._safe_float_conversion(aggregated_data[j]["current_year"])
                            for j in range(start_idx, i)
                        )
                        previous_year_total = sum(
                            self._safe_float_conversion(aggregated_data[j]["previous_year"])
                            for j in range(start_idx, i)
                        )
                        
                        # Update the total row
                        aggregated_data[i]["current_year"] = f"{current_year_total:.2f}"
                        aggregated_data[i]["previous_year"] = f"{previous_year_total:.2f}"
                    except Exception as e:
                        logger.error(f"Error calculating totals for row {i}: {str(e)}")
                        continue

            # If C001 has existing data, add it to our aggregated data
            if c001_report and c001_report.get("answers", {}).get(question_id):
                c001_data = c001_report["answers"][question_id].get("updatedData", [])
                if isinstance(c001_data, list):
                    for i, (c001_row, row_metadata) in enumerate(zip(c001_data, table_rows)):
                        if i >= len(aggregated_data):
                            break
                            
                        # Skip rows that shouldn't be aggregated
                        if not self._should_aggregate_row(row_metadata):
                            continue
                        
                        try:
                            # Add C001's existing values to our aggregated values
                            current_year_sum = self._safe_float_conversion(aggregated_data[i]["current_year"]) + \
                                             self._safe_float_conversion(c001_row.get("current_year"))
                            previous_year_sum = self._safe_float_conversion(aggregated_data[i]["previous_year"]) + \
                                              self._safe_float_conversion(c001_row.get("previous_year"))
                            
                            # Update aggregated data with formatted values
                            aggregated_data[i]["current_year"] = f"{current_year_sum:.2f}"
                            aggregated_data[i]["previous_year"] = f"{previous_year_sum:.2f}"
                        except Exception as e:
                            logger.error(f"Error adding C001's existing values for row {i}: {str(e)}")
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
            logger.info(f"Updated aggregated data in C001 for question {question_id}") 