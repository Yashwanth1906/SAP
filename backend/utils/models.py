from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime

class OrganizationBase(BaseModel):
    name: str
    city: Optional[str] = None
    country: Optional[str] = None
    email: EmailStr
    password: str
    organization_type: Optional[str] = None
    contact_number: Optional[str] = None
    website: Optional[str] = None
    registration_number: Optional[str] = None

class OrganizationCreate(OrganizationBase):
    pass

class Organization(OrganizationBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

class OrganizationLogin(BaseModel):
    email: EmailStr
    password: str

class OrganizationResponse(BaseModel):
    id: int
    name: str
    email: str
    is_premium: bool = False

class ModelBase(BaseModel):
    name: str
    type: str
    description: Optional[str] = None
    github_url: Optional[str] = None
    github_actions: Optional[bool] = None

class ModelCreate(ModelBase):
    organization_id: int

class Model(ModelBase):
    id: int
    organization_id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

class CertificationTypeBase(BaseModel):
    name: str
    description: Optional[str] = None

class CertificationType(CertificationTypeBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

class ReportBase(BaseModel):
    mitigation_techniques: Optional[str] = None
    bias_feature: Optional[str] = None
    fairness_score: Optional[float] = None
    intentional_bias: Optional[str] = None
    shap: Optional[str] = None

class Report(ReportBase):
    id: int
    model_id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

class VersionBase(BaseModel):
    name: str
    selection_data: Optional[str] = None
    is_public: Optional[bool] = False
    certification_type_id: Optional[int] = None
    report_id: Optional[int] = None

class Version(VersionBase):
    id: int
    model_id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

class VersionWithDetails(Version):
    report: Optional[Report] = None
    certification_type: Optional[CertificationType] = None

class ModelWithVersions(Model):
    versions: List[VersionWithDetails] = []

class CertifyModelRequest(BaseModel):
    version_name: str
    selection_data: Optional[str] = None
    intentional_bias: Optional[str] = None

class FairnessAnalysisRequest(BaseModel):
    model_file_path: str
    test_dataset_path: str
    sensitive_attributes: Optional[List[str]] = None 