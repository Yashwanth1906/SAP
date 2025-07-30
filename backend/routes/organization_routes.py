from fastapi import APIRouter
from controllers.organization_controller import OrganizationController
from utils.models import Organization, OrganizationCreate

router = APIRouter(prefix="/organizations", tags=["Organizations"])

@router.post("/", response_model=Organization)
def create_organization(org: OrganizationCreate):
    return OrganizationController.create_organization(org) 