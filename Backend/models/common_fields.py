from pydantic import BaseModel, Field
from typing import Optional, List

class DifferentlyAbledData(BaseModel):
    total: Optional[int] = 0
    male: Optional[int] = 0
    female: Optional[int] = 0

class EmployeeCategoryData(BaseModel):
    total: Optional[int] = 0
    male: Optional[int] = 0
    female: Optional[int] = 0
    differently_abled: Optional[DifferentlyAbledData] = DifferentlyAbledData()

class EmployeesData(BaseModel):
    permanent: Optional[EmployeeCategoryData] = EmployeeCategoryData()
    non_permanent: Optional[EmployeeCategoryData] = EmployeeCategoryData()

class WorkersData(BaseModel):
    permanent: Optional[EmployeeCategoryData] = EmployeeCategoryData()
    non_permanent: Optional[EmployeeCategoryData] = EmployeeCategoryData()

class EmployeeData(BaseModel):
    employees: Optional[EmployeesData] = EmployeesData()
    workers: Optional[WorkersData] = WorkersData()

class Financials(BaseModel):
    turnover: Optional[float] = 0
    net_worth: Optional[float] = 0

class Facilities(BaseModel):
    national: Optional[dict] = Field(default_factory=lambda: {"plants": 0, "offices": 0})
    international: Optional[dict] = Field(default_factory=lambda: {"plants": 0, "offices": 0})
    

class CommonFields(BaseModel):
    id: Optional[str] = None
    company_id: Optional[str] = None
    plant_id: Optional[str] = None
    financial_year: Optional[str] = None
    financials: Optional[Financials] = None
    employee_data: Optional[EmployeeData] = None
