from fastapi import APIRouter, UploadFile, File, Form
from controllers.model_controller import create_model, get_models_by_organization, get_model_versions_with_details, certify_model, publish_version, create_certification_type, create_report, create_version
from utils.models import ModelCreate, Model, ModelWithVersions, CertificationTypeBase, ReportBase, VersionBase
from typing import List, Optional

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
def certify_model_endpoint(
    model_id: int,
    model_file: UploadFile = File(...),
    dataset_file: UploadFile = File(...),
    version_name: str = Form(...),
    selection_data: Optional[str] = Form(None),
    intentional_bias: Optional[str] = Form(None)
):
    """Certify a model for bias analysis with file uploads"""
    return certify_model(model_id, model_file, dataset_file, version_name, selection_data, intentional_bias)

@router.post("/versions/{version_id}/publish")
def publish_version_endpoint(version_id: int):
    """Publish a version"""
    return publish_version(version_id)

# New endpoints for data population
@router.post("/certifications", response_model=dict)
def create_certification_endpoint(certification_data: CertificationTypeBase):
    """Create a new certification type"""
    return create_certification_type(certification_data)

@router.post("/reports", response_model=dict)
def create_report_endpoint(report_data: ReportBase, model_id: int):
    """Create a new report for a model"""
    return create_report(report_data, model_id)

@router.post("/versions", response_model=dict)
def create_version_endpoint(version_data: VersionBase, model_id: int):
    """Create a new version for a model"""
    return create_version(version_data, model_id)