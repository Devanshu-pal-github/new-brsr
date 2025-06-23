from models.common_fields import CommonFields
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from bson import ObjectId

# Service functions for MongoDB

async def get_common_fields(
    db: AsyncIOMotorDatabase,
    company_id: str,
    plant_id: Optional[str] = None,
    financial_year: Optional[str] = None
) -> List[dict]:
    query = {"company_id": company_id}
    if plant_id:
        query["plant_id"] = plant_id
    if financial_year:
        query["financial_year"] = financial_year
    docs = await db.common_fields.find(query).to_list(length=100)
    return docs

async def create_common_fields(fields: CommonFields, db: AsyncIOMotorDatabase, company_id: str) -> dict:
    data = fields.dict(exclude_unset=True)
    data["company_id"] = company_id
    result = await db.common_fields.insert_one(data)
    data["id"] = str(result.inserted_id)
    return data

async def update_common_fields(fields: CommonFields, db: AsyncIOMotorDatabase, company_id: str) -> dict:
    query = {
        "company_id": company_id,
        "plant_id": fields.plant_id,
        "financial_year": fields.financial_year
    }
    update = {"$set": fields.dict(exclude_unset=True)}
    result = await db.common_fields.update_one(query, update)
    if result.matched_count == 0:
        raise Exception("CommonFields entry not found.")
    doc = await db.common_fields.find_one(query)
    return doc

async def delete_common_fields(
    db: AsyncIOMotorDatabase,
    company_id: str,
    plant_id: Optional[str] = None,
    financial_year: Optional[str] = None
):
    query = {"company_id": company_id}
    if plant_id:
        query["plant_id"] = plant_id
    if financial_year:
        query["financial_year"] = financial_year
    await db.common_fields.delete_many(query)
