from datetime import datetime
from typing import List, Optional, Dict, Any, Union, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.operations import UpdateOne
from models.environment import EnvironmentReport, QuestionAnswer, TableResponse, MultiTableResponse
from bson import ObjectId
from fastapi import HTTPException, status
from .aggregation_service import AggregationService

class EnvironmentService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db["environment"]
        self.aggregation_service = AggregationService(db)

    async def create_indices(self):
        """Create indices for efficient querying"""
        await self.collection.create_index([("companyId", 1), ("plantId", 1), ("financialYear", 1)], unique=True)
        await self.collection.create_index([("companyId", 1)])
        await self.collection.create_index([("plantId", 1)])
        await self.collection.create_index([("financialYear", 1)])
        await self.collection.create_index([("status", 1)])

    async def create_report(
        self, 
        company_id: str,
        plant_id: str,
        financial_year: str
    ) -> str:
        """Create a new environment report"""
        existing_report = await self.collection.find_one({
            "companyId": company_id,
            "plantId": plant_id,
            "financialYear": financial_year
        })
        if existing_report:
            raise ValueError(f"Report already exists for plant {plant_id} in financial year {financial_year}")

        # Get plant details to determine plant type
        plant_doc = await self.db.plants.find_one({"id": plant_id})
        if not plant_doc:
            raise ValueError(f"Plant {plant_id} not found")

        # Create a new report with empty answers
        report = {
            "companyId": company_id,
            "plantId": plant_id,
            "plant_type": plant_doc.get("plant_type", "regular"),  # Get plant type from plant document
            "financialYear": financial_year,
            "answers": {},  # Initialize with empty object
            "status": "draft",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
            "version": 1
        }
        
        result = await self.collection.insert_one(report)
        return str(result.inserted_id)

    async def get_report(
        self, 
        company_id: str,
        plant_id: str,
        financial_year: str
    ) -> Optional[EnvironmentReport]:
        """Get an environment report"""
        doc = await self.collection.find_one({
            "companyId": company_id,
            "plantId": plant_id,
            "financialYear": financial_year
        })
        
        if doc:
            # Ensure each answer has the required fields
            if "answers" in doc:
                for question_id, answer in doc["answers"].items():
                    if isinstance(answer, dict):
                        # Add required fields if missing
                        answer["questionId"] = answer.get("questionId", question_id)
                        answer["questionTitle"] = answer.get("questionTitle", "")
                        answer["updatedData"] = answer.get("updatedData", {})
                        answer["lastUpdated"] = answer.get("lastUpdated", datetime.utcnow())
                        answer["auditStatus"] = answer.get("auditStatus", False)
            
            return EnvironmentReport(**doc)
        return None

    async def get_company_reports(
        self,
        company_id: str,
        plant_id: Optional[str] = None,
        financial_year: Optional[str] = None
    ) -> List[EnvironmentReport]:
        """Get all reports for a company, optionally filtered by plant and financial year"""
        query = {"companyId": company_id}
        if plant_id:
            query["plantId"] = plant_id
        if financial_year:
            query["financialYear"] = financial_year

        print(query)
        cursor = self.collection.find(query)
        reports = []
        async for doc in cursor:
            reports.append(EnvironmentReport(**doc))
        return reports

    async def update_answer(
        self, 
        company_id: str,
        plant_id: str,
        financial_year: str, 
        question_id: str,
        question_title: str, 
        answer_data: Dict[str, Any]
    ) -> bool:
        """Update answer for a specific question"""
        now = datetime.utcnow()
        
        question_answer = QuestionAnswer(
            questionId=question_id,
            questionTitle=question_title,
            updatedData=answer_data,
            lastUpdated=now
        )

        result = await self.collection.update_one(
            {
                "companyId": company_id,
                "plantId": plant_id,
                "financialYear": financial_year
            },
            {
                "$set": {
                    f"answers.{question_id}": question_answer.dict(),
                    "updatedAt": now
                }
            }
        )

        # After updating the answer, trigger aggregation
        await self.aggregation_service.aggregate_answers(
            company_id=company_id,
            financial_year=financial_year,
            question_id=question_id,
            question_title=question_title,
            answer_data=answer_data,
            source_plant_id=plant_id  # Pass the plant_id to identify the source of the update
        )

        return result.modified_count > 0

    async def add_comment(
        self, 
        company_id: str, 
        financial_year: str, 
        question_id: str, 
        comment: Dict[str, Any]
    ) -> bool:
        """Add a comment to a specific question"""
        now = datetime.utcnow()
        comment["timestamp"] = now
        
        result = await self.collection.update_one(
            {
                "companyId": company_id,
                "financialYear": financial_year
            },
            {
                "$push": {
                    f"answers.{question_id}.comments": comment
                },
                "$set": {
                    "updatedAt": now
                }
            }
        )
        return result.modified_count > 0

    async def update_attachments(
        self, 
        company_id: str, 
        financial_year: str,
        question_id: str, 
        attachments: List[str]
    ) -> bool:
        """Update attachments for a specific question"""
        now = datetime.utcnow()
        
        result = await self.collection.update_one(
            {
                "companyId": company_id,
                "financialYear": financial_year
            },
            {
                "$set": {
                    f"answers.{question_id}.attachments": attachments,
                    f"answers.{question_id}.lastUpdated": now,
                    "updatedAt": now
                }
            }
        )
        return result.modified_count > 0

    async def update_status(
        self,
        company_id: str,
        financial_year: str,
        status: str
    ) -> bool:
        """Update the status of an environment report"""
        now = datetime.utcnow()
        result = await self.collection.update_one(
            {
                "companyId": company_id,
                "financialYear": financial_year
            },
            {
                "$set": {
                    "status": status,
                    "updatedAt": now
                }
            }
        )
        return result.modified_count > 0

    async def bulk_update_answers(
        self,
        company_id: str,
        plant_id: str,
        financial_year: str,
        answers: Dict[str, Dict[str, Any]]
    ) -> bool:
        """Bulk update answers for multiple questions"""
        now = datetime.utcnow()
        update_dict = {}
        
        for question_id, answer_data in answers.items():
            question_answer = QuestionAnswer(
                questionId=question_id,
                questionTitle=answer_data.get("questionTitle", ""),
                updatedData=answer_data.get("answer_data", {}),
                lastUpdated=now
            )
            update_dict[f"answers.{question_id}"] = question_answer.dict()
        
        update_dict["updatedAt"] = now
        
        result = await self.collection.update_one(
            {
                "companyId": company_id,
                "plantId": plant_id,
                "financialYear": financial_year
            },
            {"$set": update_dict}
        )

        # After bulk updating answers, trigger aggregation for each answer
        for question_id, answer_data in answers.items():
            await self.aggregation_service.aggregate_answers(
                company_id=company_id,
                financial_year=financial_year,
                question_id=question_id,
                question_title=answer_data.get("questionTitle", ""),
                answer_data=answer_data.get("answer_data", {}),
                source_plant_id=plant_id  # Pass the plant_id to identify the source of the update
            )

        return result.modified_count > 0

    async def update_table_answer(
        self,
        company_id: str,
        plant_id: str,
        financial_year: str,
        question_id: str,
        question_title: str,
        table_data: Union[List[Dict[str, str]], Dict[str, List[Dict[str, str]]]]
    ) -> bool:
        """Update table answer for a specific question"""
        now = datetime.utcnow()

        def extract_number_and_unit(value: str) -> Tuple[float, str]:
            """Extract numeric value and unit from a string like '10 joule' or '10'"""
            if not value or value.strip() == "":
                return 0.0, ""
                
            # Split the string into parts
            parts = value.strip().split(maxsplit=1)
            
            try:
                # Try to convert first part to float
                number = float(parts[0].replace(',', ''))
                # Get unit if it exists
                unit = parts[1] if len(parts) > 1 else ""
                return number, unit
            except (ValueError, IndexError):
                return 0.0, ""

        # If this is C001 plant, we should not trigger aggregation
        is_c001 = await self.aggregation_service.is_aggregator_plant(company_id, plant_id)
        
        if is_c001:
            # For C001, just update directly without aggregation
            question_answer = QuestionAnswer(
                questionId=question_id,
                questionTitle=question_title,
                updatedData=table_data,
                lastUpdated=now
            )

            result = await self.collection.update_one(
                {
                    "companyId": company_id,
                    "plantId": plant_id,
                    "financialYear": financial_year
                },
                {
                    "$set": {
                        f"answers.{question_id}": question_answer.dict(),
                        "updatedAt": now
                    }
                }
            )
            return result.modified_count > 0

        # For other plants, first update this plant's data
        question_answer = QuestionAnswer(
            questionId=question_id,
            questionTitle=question_title,
            updatedData=table_data,
            lastUpdated=now
        )

        result = await self.collection.update_one(
            {
                "companyId": company_id,
                "plantId": plant_id,
                "financialYear": financial_year
            },
            {
                "$set": {
                    f"answers.{question_id}": question_answer.dict(),
                    "updatedAt": now
                }
            }
        )

        if result.modified_count > 0:
            # After updating the plant's data, get all plants' data
            all_plants = await self.aggregation_service.get_all_regular_plants(company_id)
            aggregated_data = []

            # First, initialize with zeros and store units from current plant's data
            if isinstance(table_data, list):
                # Initialize with zeros and empty units
                aggregated_data = [
                    {
                        "current_year": {"value": 0.0, "unit": ""},
                        "previous_year": {"value": 0.0, "unit": ""}
                    } 
                    for _ in table_data
                ]
                
                # Add current plant's data and capture units
                for i, row in enumerate(table_data):
                    current_value, current_unit = extract_number_and_unit(row.get("current_year", "0"))
                    previous_value, previous_unit = extract_number_and_unit(row.get("previous_year", "0"))
                    
                    aggregated_data[i]["current_year"]["value"] = current_value
                    aggregated_data[i]["current_year"]["unit"] = current_unit
                    aggregated_data[i]["previous_year"]["value"] = previous_value
                    aggregated_data[i]["previous_year"]["unit"] = previous_unit

            # Then add data from other regular plants
            for other_plant in all_plants:
                if other_plant["id"] != plant_id:  # Skip the current plant
                    plant_report = await self.collection.find_one({
                        "companyId": company_id,
                        "plantId": other_plant["id"],
                        "financialYear": financial_year
                    })
                    
                    if plant_report and plant_report.get("answers", {}).get(question_id):
                        plant_data = plant_report["answers"][question_id].get("updatedData", [])
                        if isinstance(plant_data, list):
                            for i, row in enumerate(plant_data):
                                if i < len(aggregated_data):
                                    current_value, current_unit = extract_number_and_unit(row.get("current_year", "0"))
                                    previous_value, previous_unit = extract_number_and_unit(row.get("previous_year", "0"))
                                    
                                    # Add values
                                    aggregated_data[i]["current_year"]["value"] += current_value
                                    aggregated_data[i]["previous_year"]["value"] += previous_value
                                    
                                    # Keep units if not already set
                                    if not aggregated_data[i]["current_year"]["unit"] and current_unit:
                                        aggregated_data[i]["current_year"]["unit"] = current_unit
                                    if not aggregated_data[i]["previous_year"]["unit"] and previous_unit:
                                        aggregated_data[i]["previous_year"]["unit"] = previous_unit

            # Format the final data with units
            final_data = []
            for row in aggregated_data:
                current_value = f"{row['current_year']['value']:.2f}"
                current_unit = row['current_year']['unit']
                previous_value = f"{row['previous_year']['value']:.2f}"
                previous_unit = row['previous_year']['unit']
                
                final_data.append({
                    "current_year": f"{current_value} {current_unit}".strip(),
                    "previous_year": f"{previous_value} {previous_unit}".strip()
                })

            # Update C001 with aggregated data
            c001_plant = await self.aggregation_service.get_company_aggregator_plant(company_id)
            if c001_plant:
                c001_answer = QuestionAnswer(
                    questionId=question_id,
                    questionTitle=question_title,
                    updatedData=final_data,
                    lastUpdated=now
                )

                await self.collection.update_one(
                    {
                        "companyId": company_id,
                        "plantId": c001_plant["id"],
                        "financialYear": financial_year
                    },
                    {
                        "$set": {
                            f"answers.{question_id}": c001_answer.dict(),
                            "updatedAt": now
                        }
                    }
                )

        return result.modified_count > 0

    async def patch_table_answer(
        self,
        company_id: str,
        plant_id: str,
        financial_year: str,
        question_id: str,
        question_title: str,
        row_updates: List[Dict[str, Union[int, str]]]
    ) -> bool:
        """Update specific rows in a table answer"""
        now = datetime.utcnow()

        # First get the existing answer
        report = await self.collection.find_one({
            "companyId": company_id,
            "plantId": plant_id,
            "financialYear": financial_year
        })

        if not report:
            return False

        # Get existing answer data or initialize empty array
        existing_answer = report.get("answers", {}).get(question_id, {})
        existing_data = existing_answer.get("updatedData", [])
        
        if not isinstance(existing_data, list):
            # Handle case where existing data is not an array (e.g., multi-table)
            return False

        # Process and validate all row indices first
        validated_updates = []
        max_index = -1
        for update in row_updates:
            try:
                index = int(update["row_index"])
                if index < 0:
                    return False  # Reject negative indices
                max_index = max(max_index, index)
                validated_updates.append({
                    "row_index": index,
                    "current_year": str(update["current_year"]),
                    "previous_year": str(update["previous_year"])
                })
            except (ValueError, TypeError):
                return False  # Invalid row_index that can't be converted to int

        # Ensure the list has enough capacity
        while len(existing_data) <= max_index:
            existing_data.append({"current_year": "", "previous_year": ""})

        # Apply the validated updates
        for update in validated_updates:
            index = update["row_index"]
            existing_data[index] = {
                "current_year": update["current_year"],
                "previous_year": update["previous_year"]
            }

        # Create or update the answer
        question_answer = QuestionAnswer(
            questionId=question_id,
            questionTitle=question_title,
            updatedData=existing_data,
            lastUpdated=now
        )

        result = await self.collection.update_one(
            {
                "companyId": company_id,
                "plantId": plant_id,
                "financialYear": financial_year
            },
            {
                "$set": {
                    f"answers.{question_id}": question_answer.dict(),
                    "updatedAt": now
                }
            }
        )

        # After updating the answer, trigger aggregation
        await self.aggregation_service.aggregate_answers(
            company_id=company_id,
            financial_year=financial_year,
            question_id=question_id,
            question_title=question_title,
            answer_data={"updatedData": existing_data},
            source_plant_id=plant_id
        )

        return result.modified_count > 0

    async def update_subjective_answer(
        self,
        company_id: str,
        financial_year: str,
        question_id: str,
        question_title: str,
        answer_text: str
    ) -> bool:
        """Update a subjective answer for a specific question"""
        now = datetime.utcnow()
        
        question_answer = QuestionAnswer(
            questionId=question_id,
            questionTitle=question_title,
            updatedData={
                "type": "subjective",
                "text": answer_text
            },
            lastUpdated=now
        )

        result = await self.collection.update_one(
            {
                "companyId": company_id,
                "financialYear": financial_year
            },
            {
                "$set": {
                    f"answers.{question_id}": question_answer.dict(),
                    "updatedAt": now
                }
            }
        )
        return result.modified_count > 0

    async def update_audit_status(
        self,
        company_id: str,
        financial_year: str,
        question_id: str,
        audit_status: bool
    ) -> bool:
        """Update audit status for a specific question"""
        now = datetime.utcnow()
        
        result = await self.collection.update_one(
            {
                "companyId": company_id,
                "financialYear": financial_year
            },
            {
                "$set": {
                    f"answers.{question_id}.auditStatus": audit_status,
                    "updatedAt": now
                }
            }
        )
        return result.modified_count > 0

