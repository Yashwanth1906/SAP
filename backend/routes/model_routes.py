from fastapi import APIRouter, UploadFile, File, Form
from controllers.model_controller import create_model, get_models_by_organization, get_model_versions_with_details, certify_model, publish_version, create_certification_type, create_report, create_version, addalerts, perform_fairness_analysis
from utils.models import ModelCreate, Model, ModelWithVersions, CertificationTypeBase, ReportBase, VersionBase, FairnessAnalysisRequest
from typing import List, Optional

import os
import hmac
import hashlib
from fastapi import Request, HTTPException
from controllers.model_controller import generate_unbiased_test_data

router = APIRouter(prefix="/models", tags=["Models"])

@router.post("/upload", response_model=Model)
def upload_model(model_data: ModelCreate):
    
    return create_model(model_data)

@router.get("/organization/{organization_id}", response_model=List[Model])
def get_organization_models(organization_id: int):
    
    return get_models_by_organization(organization_id)

@router.get("/{model_id}/versions", response_model=ModelWithVersions)
def get_model_versions(model_id: int):
    
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
    
    return certify_model(model_id, model_file, dataset_file, version_name, selection_data, intentional_bias)

@router.post("/fairness-analysis")
def perform_fairness_analysis_endpoint(request: FairnessAnalysisRequest):
    
    return perform_fairness_analysis(
        model_file_path=request.model_file_path,
        test_dataset_path=request.test_dataset_path,
        sensitive_attributes=request.sensitive_attributes
    )

@router.post("/versions/{version_id}/publish")
def publish_version_endpoint(version_id: int):
    
    return publish_version(version_id)


@router.post("/certifications", response_model=dict)
def create_certification_endpoint(certification_data: CertificationTypeBase):
    
    return create_certification_type(certification_data)

@router.post("/reports", response_model=dict)
def create_report_endpoint(report_data: ReportBase, model_id: int):
    
    return create_report(report_data, model_id)

@router.post("/versions", response_model=dict)
def create_version_endpoint(version_data: VersionBase, model_id: int):
    
    return create_version(version_data, model_id)


@router.post("/generate-unbiased-test-data")
def generate_unbiased_test_data_endpoint(headers: list[str], model_description: str, sample_data: list[list[str]] = None):
                    
    return generate_unbiased_test_data(headers, model_description, sample_data)


@router.post("/github-webhook")
async def github_webhook(request: Request):
    GITHUB_SECRET = os.environ.get("GITHUB_SECRET", "your_secret_here")
    signature = request.headers.get('x-hub-signature-256')
    body = await request.body()

    if not signature:
        raise HTTPException(status_code=400, detail="Missing signature")

    mac = hmac.new(GITHUB_SECRET.encode(), msg=body, digestmod=hashlib.sha256)
    expected = 'sha256=' + mac.hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    data = await request.json()
    print(data)

    repo_url = data.get("repository", {}).get("html_url")
    if not repo_url:
        print("No repository URL provided in webhook payload.")
        return {"message": "Webhook received, but no repository URL provided."}

    
    
    result = addalerts(repo_url)
    return result
