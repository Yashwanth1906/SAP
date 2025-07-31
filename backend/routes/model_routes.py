from fastapi import APIRouter
from controllers.model_controller import create_model, get_models_by_organization, get_model_versions_with_details, certify_model, publish_version
from utils.models import ModelCreate, Model, ModelWithVersions
from typing import List

router = APIRouter(prefix="/models", tags=["Models"])

@router.post("/upload", response_model=Model)
def upload_model(model_data: ModelCreate):
    """Upload a new model"""
    return create_model(model_data)

@router.get("/organization/{organization_id}", response_model=List[Model])
def get_organization_models(organization_id: int):
    """Get all models for an organization"""
    return get_models_by_organization(organization_id)

@router.get("/{model_id}/versions", response_model=ModelWithVersions)
def get_model_versions(model_id: int):
    """Get detailed versions of a model with reports"""
    return get_model_versions_with_details(model_id)

@router.post("/{model_id}/certify")
def certify_model_endpoint(model_id: int):
    """Certify a model for bias analysis"""
    return certify_model(model_id)

@router.post("/versions/{version_id}/publish")
def publish_version_endpoint(version_id: int):
    """Publish a version"""
    return publish_version(version_id) 