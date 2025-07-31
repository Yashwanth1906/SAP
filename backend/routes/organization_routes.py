from fastapi import APIRouter
from controllers.organization_controller import create_organization, login_organization
from utils.models import OrganizationCreate, OrganizationLogin, OrganizationResponse

router = APIRouter(prefix="/organizations", tags=["Organizations"])

@router.post("/register", response_model=OrganizationResponse)
def register_organization(org_data: OrganizationCreate):
    """Register a new organization"""
    return create_organization(org_data)

@router.post("/login", response_model=OrganizationResponse)
def login_organization_endpoint(login_data: OrganizationLogin):
    """Login organization"""
    return login_organization(login_data)