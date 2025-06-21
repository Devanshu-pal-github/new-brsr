from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid

class GHGSubcategory(BaseModel):
    subcategory_name: str
    quantity: Optional[float] = None
    unit: Optional[str] = None
    emission_factor: Optional[float] = None
    emission_factor_unit: Optional[str] = None
    emissions_co2e: Optional[float] = None
    data_source: Optional[str] = None
    notes: Optional[str] = None
    is_calculated: Optional[bool] = None

class GHGCategory(BaseModel):
    category_name: str
    subcategories: List[GHGSubcategory]
    total_category_emissions_co2e: Optional[float] = None

class GHGReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    company_id: str
    plant_id: Optional[str] = None
    financial_year: str
    scope: str  # e.g., "Scope 1", "Scope 2", "Scope 3", etc.
    categories: List[GHGCategory]
    total_scope_emissions_co2e: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
