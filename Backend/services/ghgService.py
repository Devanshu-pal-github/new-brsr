from motor.motor_asyncio import AsyncIOMotorDatabase
from models.ghgModel import GHGReport
from typing import Optional
from datetime import datetime

class GHGService:
    def __init__(self, db):  # Remove type annotation for compatibility
        self.db = db
        self.collection = db["ghg_reports"]

    async def get_report(self, company_id: str, financial_year: str, plant_id: Optional[str], scope: Optional[str]) -> Optional[GHGReport]:
        query = {"company_id": company_id, "financial_year": financial_year}
        if plant_id:
            query["plant_id"] = plant_id
        if scope:
            query["scope"] = scope
        doc = await self.collection.find_one(query)
        if doc:
            if '_id' in doc:
                del doc['_id']  # Remove MongoDB _id before returning
            return GHGReport(**doc)
        return None

    async def upsert_report(self, report: GHGReport) -> GHGReport:
        query = {
            "company_id": report.company_id,
            "financial_year": report.financial_year,
            "scope": report.scope
        }
        if report.plant_id:
            query["plant_id"] = report.plant_id
        now = datetime.utcnow()
        report.updated_at = now
        if not report.created_at:
            report.created_at = now

        # Fetch existing report
        existing_doc = await self.collection.find_one(query)
        if existing_doc:
            # Merge categories and subcategories with partial update support
            existing_categories = existing_doc.get("categories", [])
            new_categories = report.categories
            merged_categories = existing_categories.copy()
            for new_cat in new_categories:
                match = next((cat for cat in merged_categories if cat["category_name"] == new_cat.category_name), None)
                if match:
                    existing_subs = match.get("subcategories", [])
                    for new_sub in new_cat.subcategories:
                        sub_match = next((sub for sub in existing_subs if sub["subcategory_name"] == new_sub.subcategory_name), None)
                        if sub_match:
                            # Partial update: only update provided fields
                            for k, v in new_sub.dict(exclude_unset=True).items():
                                sub_match[k] = v
                        else:
                            existing_subs.append(new_sub.dict())
                    match["subcategories"] = existing_subs
                    if hasattr(new_cat, "total_category_emissions_co2e"):
                        match["total_category_emissions_co2e"] = new_cat.total_category_emissions_co2e
                else:
                    merged_categories.append(new_cat.dict())
            update_data = report.dict(by_alias=True, exclude={"id", "_id", "categories"})
            update_data["categories"] = merged_categories
        else:
            update_data = report.dict(by_alias=True, exclude={"id", "_id"})

        await self.collection.update_one(
            query,
            {"$set": update_data},
            upsert=True
        )
        return report

    async def get_total_co2_emissions(self, company_id: str, financial_year: Optional[str] = None, scope: Optional[str] = None) -> float:
        query = {"company_id": company_id}
        if financial_year:
            query["financial_year"] = financial_year
        if scope:
            query["scope"] = scope
        cursor = self.collection.find(query)
        total = 0.0
        async for doc in cursor:
            total += float(doc.get("total_scope_emissions_co2e", 0))
        return total

    async def get_total_co2_emissions_by_scope(self, company_id: str, financial_year: str, scopes: Optional[list] = None):
        query = {"company_id": company_id, "financial_year": financial_year}
        if scopes:
            query["scope"] = {"$in": list(scopes)}
        cursor = self.collection.find(query)
        result = {}
        async for doc in cursor:
            scope = doc.get("scope", "Unknown")
            total = float(doc.get("total_scope_emissions_co2e", 0))
            result[scope] = total
        return result
