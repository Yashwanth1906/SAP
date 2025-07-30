from pydantic import BaseModel, EmailStr
from typing import Optional, List

# Organization Models
class OrganizationBase(BaseModel):
    name: str
    address: str

class OrganizationCreate(OrganizationBase):
    pass

class Organization(OrganizationBase):
    id: int
    admin_id: Optional[int] = None
    
    class Config:
        from_attributes = True

# User Models
class UserBase(BaseModel):
    email: EmailStr
    password: str

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: int
    organization_id: Optional[int] = None
    
    class Config:
        from_attributes = True

# Model Models
class ModelBase(BaseModel):
    name: str
    type: str
    certification_category: str
    bias_on: bool
    intentional_bias: bool

class ModelCreate(ModelBase):
    pass

class Model(ModelBase):
    id: int
    organization_id: int
    
    class Config:
        from_attributes = True

# Response Models
class UserResponse(BaseModel):
    message: str
    organization_name: Optional[str] = None
    is_new_user: bool 